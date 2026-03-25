/**
 * Script para limpiar todos los registros transaccionales de órdenes.
 *
 * Elimina: cotizaciones, órdenes de pedido, órdenes de trabajo,
 *          órdenes de gasto y órdenes de producción,
 *          junto con sus tablas hijas y registros relacionados.
 *
 * USO:
 *   npx ts-node scripts/clean-orders.ts                           # usa DATABASE_URL del .env.development
 *   npx ts-node scripts/clean-orders.ts "postgresql://user:pass@host:5432/db"
 *   npx ts-node scripts/clean-orders.ts --yes                     # sin confirmación interactiva
 *   npx ts-node scripts/clean-orders.ts "postgresql://..." --yes  # conexión custom + sin confirmación
 */

import { Client } from 'pg';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// ─── Orden de eliminación (hijos primero → padres al final) ────────────────────
const TABLES_TO_TRUNCATE = [
  // 1. Órdenes de producción
  'production_order_steps',
  'production_order_components',
  'production_orders',

  // 2. Órdenes de gasto
  'expense_order_auth_requests',
  'expense_order_item_production_areas',
  'expense_order_items',
  'expense_orders',

  // 3. Órdenes de trabajo
  'work_order_time_entries',
  'work_order_item_supplies',
  'work_order_item_production_areas',
  'work_order_items',
  'work_orders',

  // 4. Órdenes de pedido
  'client_ownership_auth_requests',
  'advance_payment_approvals',
  'payments',
  'order_status_change_requests',
  'order_edit_requests',
  'order_discounts',
  'order_item_production_areas',
  'order_items',
  'orders',

  // 5. Cotizaciones
  'quote_item_production_areas',
  'quote_items',
  'quotes',
];

// Modelos Prisma que se registran en audit_logs.model
const AUDIT_MODELS = [
  'Quote', 'QuoteItem',
  'Order', 'OrderItem', 'OrderDiscount', 'OrderEditRequest',
  'OrderStatusChangeRequest', 'Payment', 'AdvancePaymentApproval',
  'ClientOwnershipAuthRequest',
  'WorkOrder', 'WorkOrderItem', 'WorkOrderTimeEntry',
  'ExpenseOrder', 'ExpenseOrderItem', 'ExpenseOrderAuthRequest',
  'ProductionOrder', 'ProductionOrderComponent', 'ProductionOrderStep',
];

// entity_type para uploaded_files
const FILE_ENTITY_TYPES = [
  'quote', 'order', 'work_order', 'expense_order', 'production_order',
  'payment',
];

// related_type para notifications
const NOTIFICATION_RELATED_TYPES = [
  'order', 'order_edit_request', 'order_status_change_request',
  'expense_order', 'expense_order_auth_request',
  'advance_payment_approval', 'client_ownership_auth_request',
  'work_order', 'production_order',
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function resolveDatabaseUrl(args: string[]): string {
  // Buscar argumento que parezca una URL de PostgreSQL
  const urlArg = args.find((a) => a.startsWith('postgresql://') || a.startsWith('postgres://'));
  if (urlArg) return urlArg;

  // Fallback: leer desde .env.development
  const envPath = path.resolve(__dirname, '..', '.env.development');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^DATABASE_URL="?([^"\n]+)"?/m);
    if (match) return match[1];
  }

  console.error('❌ No se encontró DATABASE_URL. Pásala como argumento o verifica .env.development');
  process.exit(1);
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    u.password = '****';
    return u.toString();
  } catch {
    return url.replace(/:[^@]+@/, ':****@');
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const databaseUrl = resolveDatabaseUrl(args);
  const skipConfirm = hasFlag('--yes') || hasFlag('-y');

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     🧹 LIMPIEZA DE ÓRDENES — High Solutions Backoffice     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`📦 Base de datos: ${maskUrl(databaseUrl)}`);
  console.log(`📋 Tablas a limpiar: ${TABLES_TO_TRUNCATE.length}`);
  console.log();
  console.log('Se eliminarán TODOS los registros de:');
  console.log('  • Cotizaciones (quotes)');
  console.log('  • Órdenes de pedido (orders)');
  console.log('  • Órdenes de trabajo (work_orders)');
  console.log('  • Órdenes de gasto (expense_orders)');
  console.log('  • Órdenes de producción (production_orders)');
  console.log('  • Pagos, descuentos, solicitudes de edición/aprobación');
  console.log('  • Archivos asociados, notificaciones y auditoría relacionada');
  console.log('  • Consecutivos se reiniciarán a 0');
  console.log();

  if (!skipConfirm) {
    const ok = await confirm('⚠️  ¿Estás seguro? Escribe "yes" para continuar: ');
    if (!ok) {
      console.log('❌ Operación cancelada.');
      process.exit(0);
    }
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('\n✅ Conectado a la base de datos.\n');

    // Desactivar triggers temporalmente para mayor velocidad
    await client.query('SET session_replication_role = replica;');

    let totalDeleted = 0;

    // 1. Limpiar tablas transaccionales
    for (const table of TABLES_TO_TRUNCATE) {
      try {
        const result = await client.query(`DELETE FROM "${table}"`);
        const count = result.rowCount ?? 0;
        totalDeleted += count;
        const icon = count > 0 ? '🗑️ ' : '  ';
        console.log(`${icon} ${table}: ${count} registros eliminados`);
      } catch (err: any) {
        // La tabla podría no existir si una migración no se ha ejecutado
        console.log(`⚠️  ${table}: ${err.message}`);
      }
    }

    // 2. Limpiar WhatsApp action contexts (vinculados a aprobaciones)
    try {
      const result = await client.query(`DELETE FROM "whatsapp_action_contexts"`);
      const count = result.rowCount ?? 0;
      totalDeleted += count;
      console.log(`🗑️  whatsapp_action_contexts: ${count} registros eliminados`);
    } catch (err: any) {
      console.log(`⚠️  whatsapp_action_contexts: ${err.message}`);
    }

    // 3. Limpiar notificaciones relacionadas
    if (NOTIFICATION_RELATED_TYPES.length > 0) {
      try {
        const placeholders = NOTIFICATION_RELATED_TYPES.map((_, i) => `$${i + 1}`).join(', ');
        const result = await client.query(
          `DELETE FROM "notifications" WHERE "related_type" IN (${placeholders})`,
          NOTIFICATION_RELATED_TYPES,
        );
        const count = result.rowCount ?? 0;
        totalDeleted += count;
        console.log(`🗑️  notifications (relacionadas): ${count} registros eliminados`);
      } catch (err: any) {
        console.log(`⚠️  notifications: ${err.message}`);
      }
    }

    // 4. Limpiar archivos subidos relacionados
    if (FILE_ENTITY_TYPES.length > 0) {
      try {
        const placeholders = FILE_ENTITY_TYPES.map((_, i) => `$${i + 1}`).join(', ');
        const result = await client.query(
          `DELETE FROM "uploaded_files" WHERE "entity_type" IN (${placeholders})`,
          FILE_ENTITY_TYPES,
        );
        const count = result.rowCount ?? 0;
        totalDeleted += count;
        console.log(`🗑️  uploaded_files (relacionados): ${count} registros eliminados`);
      } catch (err: any) {
        console.log(`⚠️  uploaded_files: ${err.message}`);
      }
    }

    // 5. Limpiar audit logs relacionados
    if (AUDIT_MODELS.length > 0) {
      try {
        const placeholders = AUDIT_MODELS.map((_, i) => `$${i + 1}`).join(', ');
        const result = await client.query(
          `DELETE FROM "audit_logs" WHERE "model" IN (${placeholders})`,
          AUDIT_MODELS,
        );
        const count = result.rowCount ?? 0;
        totalDeleted += count;
        console.log(`🗑️  audit_logs (relacionados): ${count} registros eliminados`);
      } catch (err: any) {
        console.log(`⚠️  audit_logs: ${err.message}`);
      }
    }

    // 6. Reiniciar consecutivos a 0
    try {
      const result = await client.query(`UPDATE "consecutives" SET "last_number" = 0`);
      const count = result.rowCount ?? 0;
      console.log(`🔄 consecutives: ${count} consecutivos reiniciados a 0`);
    } catch (err: any) {
      console.log(`⚠️  consecutives: ${err.message}`);
    }

    // Reactivar triggers
    await client.query('SET session_replication_role = DEFAULT;');

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(`✅ Limpieza completada. Total de registros eliminados: ${totalDeleted}`);
    console.log('══════════════════════════════════════════════════════════════\n');
  } catch (err: any) {
    console.error('\n❌ Error durante la limpieza:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
