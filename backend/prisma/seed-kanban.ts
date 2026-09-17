/**
 * Targeted seed: Quote Kanban Columns + related permissions
 * Safe to run multiple times (idempotent)
 */
import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('\n=== Kanban Seed (staging) ===\n');

  // ── 1. Permissions ─────────────────────────────────────────
  const kanbanPermissions = [
    { name: 'manage_quote_columns', description: 'Administrar columnas del tablero Kanban de cotizaciones' },
    { name: 'read_all_quotes',      description: 'Ver todas las cotizaciones en el tablero (no solo las propias)' },
  ];

  for (const perm of kanbanPermissions) {
    const existing = await prisma.permission.findUnique({ where: { name: perm.name } });
    if (!existing) {
      await prisma.permission.create({ data: perm });
      console.log(`  ✅ Created permission: ${perm.name}`);
    } else {
      console.log(`  ⏭  Permission already exists: ${perm.name}`);
    }
  }

  // ── 2. Default Kanban Columns ───────────────────────────────
  const defaultKanbanColumns = [
    { mappedStatus: 'DRAFT' as const,       name: 'Borrador',      color: '#757575', displayOrder: 0 },
    { mappedStatus: 'SENT' as const,        name: 'Enviada',       color: '#0288d1', displayOrder: 1 },
    { mappedStatus: 'FOLLOW_UP_1' as const, name: 'Seguimiento 1', color: '#00897b', displayOrder: 2 },
    { mappedStatus: 'FOLLOW_UP_2' as const, name: 'Seguimiento 2', color: '#3949ab', displayOrder: 3 },
    { mappedStatus: 'FOLLOW_UP_3' as const, name: 'Seguimiento 3', color: '#8e24aa', displayOrder: 4 },
    { mappedStatus: 'ACCEPTED' as const,    name: 'Aceptada',      color: '#2e7d32', displayOrder: 5 },
    { mappedStatus: 'NO_RESPONSE' as const, name: 'Sin Respuesta', color: '#f57c00', displayOrder: 6 },
    { mappedStatus: 'CONVERTED' as const,   name: 'Convertida',    color: '#7b1fa2', displayOrder: 7 },
    { mappedStatus: 'REJECTED' as const,    name: 'Rechazada',     color: '#d32f2f', displayOrder: 8 },
  ];

  for (const col of defaultKanbanColumns) {
    const existing = await prisma.quoteKanbanColumn.findFirst({
      where: { mappedStatus: col.mappedStatus, name: col.name },
    });
    if (!existing) {
      await prisma.quoteKanbanColumn.create({ data: col });
      console.log(`  ✅ Created kanban column: ${col.name} (${col.mappedStatus})`);
    } else if (existing.displayOrder !== col.displayOrder) {
      // Los seguimientos se intercalan entre Enviada y Aceptada: las columnas
      // que ya existían tienen que correrse para dejarles el espacio.
      await prisma.quoteKanbanColumn.update({
        where: { id: existing.id },
        data: { displayOrder: col.displayOrder },
      });
      console.log(`  ↕️  Reordered kanban column: ${col.name} → ${col.displayOrder}`);
    } else {
      console.log(`  ⏭  Kanban column already exists: ${col.name}`);
    }
  }

  console.log('\n=== Done ===\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
