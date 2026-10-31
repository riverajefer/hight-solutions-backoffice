/**
 * Saneamiento del saldo por cobrar de OPs anuladas.
 *
 * Contexto
 * --------
 * Antes del 2026-09-22 anular una OP solo cambiaba el estado: `reversedAmount`
 * quedaba en 0 y el saldo seguía mostrando lo que faltaba por pagar.
 *
 *   OP-2026-2009 → anulada por repetida, total $696.000, $0 pagados
 *   → aparece debiendo $696.000 por un trabajo que no existe
 *
 * En producción a 2026-10-30: 15 órdenes por $3.310.900, 10 sin dinero recibido
 * y 5 con abonos. El origen ya está corregido (`annulOrder`), así que este script
 * es para el histórico, no para un goteo que siga llegando.
 *
 * Qué hace
 * --------
 * Por cada OP anulada con saldo positivo:
 *
 *   - sube `reversedAmount` lo justo para que el saldo quede en 0;
 *   - deja un `AuditLog` con los valores anteriores y los nuevos.
 *
 * En una OP con abonos eso equivale a que la empresa retuvo lo pagado, que es
 * como ya estaba: no crea saldo a favor. Si el cliente decide devolver ese dinero
 * atrapado, esa decisión sigue abierta y va aparte.
 *
 * No toca pagos, caja, `paidAmount` ni `reversedNetAmount`: las OPs anuladas ya
 * están fuera de ventas y comisiones. Se saltan las que tengan una devolución
 * abierta: esa solicitud hay que cerrarla primero.
 *
 * Uso
 * ---
 *   npx ts-node scripts/sanitize-annulled-phantom-balance.ts                 # dry-run sobre .env.development
 *   npx ts-node scripts/sanitize-annulled-phantom-balance.ts --env=production
 *   npx ts-node scripts/sanitize-annulled-phantom-balance.ts --env=production --confirmar=15
 *
 * Opciones
 *   --confirmar=<n>    escribe, si <n> coincide con las órdenes del dry-run
 *   --env=<nombre>     archivo .env.<nombre> del que leer DATABASE_URL
 *   --orders=OP-1,OP-2 limita el saneamiento a esas órdenes
 *
 * Es idempotente: tras ajustarlas, el saldo queda en 0 y dejan de entrar en el
 * filtro.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  EditRequestStatus,
  OrderStatus,
  PrismaClient,
  Prisma,
} from '../src/generated/prisma';
import { computeOrderBalance } from '../src/common/utils/order-balance.util';

const CONFIRM = process.argv
  .find((a) => a.startsWith('--confirmar='))
  ?.split('=')[1];
const APPLY = CONFIRM !== undefined;
const ENV =
  process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ??
  'development';
const ONLY_ORDERS = (
  process.argv.find((a) => a.startsWith('--orders='))?.split('=')[1] ?? ''
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    console.log(`Usando DATABASE_URL del entorno (no se lee .env.${ENV}).`);
    return process.env.DATABASE_URL;
  }
  const envPath = path.resolve(__dirname, '..', `.env.${ENV}`);
  if (!fs.existsSync(envPath)) {
    console.error(`❌ No se encontró ${envPath}`);
    process.exit(1);
  }
  const match = fs
    .readFileSync(envPath, 'utf8')
    .match(/^DATABASE_URL\s*=\s*['"]?([^'"\n]+?)['"]?\s*$/m);
  if (!match) {
    console.error(`❌ ${envPath} no define DATABASE_URL`);
    process.exit(1);
  }
  return match[1];
}

const pool = new Pool({ connectionString: resolveDatabaseUrl(), max: 2 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const money = (v: unknown) =>
  Number(String(v)).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

/**
 * Usuario al que se atribuye el ajuste. Se toma el admin más antiguo: es un
 * asiento administrativo, no la acción de un asesor.
 */
async function resolveActorId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: { name: { in: ['admin', 'Admin', 'ADMIN'] } } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return admin?.id ?? null;
}

async function main() {
  console.log(`Ambiente: ${ENV}`);
  console.log(APPLY ? '=== MODO APLICAR ===' : '=== DRY-RUN (sin cambios) ===');
  if (ONLY_ORDERS.length > 0) {
    console.log(`Limitado a: ${ONLY_ORDERS.join(', ')}`);
  }
  console.log('');

  const candidates = await prisma.order.findMany({
    where: {
      status: OrderStatus.ANULADO,
      balance: { gt: 0 },
      ...(ONLY_ORDERS.length > 0 ? { orderNumber: { in: ONLY_ORDERS } } : {}),
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      paidAmount: true,
      appliedCreditAmount: true,
      reversedAmount: true,
      balance: true,
      refundRequests: {
        where: {
          OR: [
            { status: EditRequestStatus.PENDING },
            { status: EditRequestStatus.APPROVED, executedAt: null },
          ],
        },
        select: { id: true },
      },
    },
    orderBy: { orderDate: 'asc' },
  });

  const targets = candidates.filter((o) => o.refundRequests.length === 0);
  const saltadas = candidates.filter((o) => o.refundRequests.length > 0);

  console.log(
    `OPs anuladas con saldo por cobrar: ${candidates.length} · ajustables: ${targets.length} · con devolución abierta: ${saltadas.length}\n`,
  );
  for (const o of saltadas) {
    console.log(`⚠️  ${o.orderNumber}: tiene una devolución abierta, se salta`);
  }

  if (targets.length === 0) {
    console.log('Nada que sanear.');
    return;
  }

  if (APPLY && Number(CONFIRM) !== targets.length) {
    console.error(
      `❌ --confirmar=${CONFIRM} no coincide con las ${targets.length} órdenes ajustables. No se escribió nada.`,
    );
    process.exitCode = 1;
    return;
  }

  const actorId = await resolveActorId();
  let liberado = new Prisma.Decimal(0);

  for (const o of targets) {
    const reversedAmount = new Prisma.Decimal(o.reversedAmount).add(o.balance);
    const balance = computeOrderBalance({ ...o, reversedAmount });

    if (!balance.isZero()) {
      throw new Error(
        `${o.orderNumber}: el saldo calculado es ${balance.toString()} y debía ser 0. Revisa la OP antes de seguir.`,
      );
    }

    liberado = liberado.add(o.balance);
    console.log(
      `${o.orderNumber} total ${money(o.total)} · pagado ${money(o.paidAmount)} · anulado ${money(o.reversedAmount)} → ${money(reversedAmount)} · saldo ${money(o.balance)} → ${money(balance)}`,
    );

    if (!APPLY) continue;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: o.id },
        data: { reversedAmount, balance },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          recordId: o.id,
          model: 'Order',
          action: 'SANITIZE_ANNULLED_BALANCE',
          oldData: {
            reversedAmount: o.reversedAmount.toString(),
            balance: o.balance.toString(),
          },
          newData: {
            reversedAmount: reversedAmount.toString(),
            balance: balance.toString(),
          },
          changedFields: ['reversedAmount', 'balance'],
          metadata: {
            motivo:
              'OP anulada antes de 2026-09-22 con saldo por cobrar. Se lleva el saldo a 0 sin tocar pagos ni caja.',
            script: 'sanitize-annulled-phantom-balance',
          },
        },
      });
    });
  }

  console.log('');
  console.log(`Saldo por cobrar eliminado: ${money(liberado)}`);
  console.log(
    APPLY
      ? `\n✅ ${targets.length} órdenes ajustadas.`
      : `\nDry-run: no se escribió nada. Repite con --confirmar=${targets.length} para aplicar.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
