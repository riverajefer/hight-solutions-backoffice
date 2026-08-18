/**
 * Saneamiento de pagos a crédito registrados con monto.
 *
 * Contexto
 * --------
 * `CREDIT` ("Crédito"/"fiado") no es dinero que entre: es la marca de que la OP
 * se entrega y el cliente paga después. Su monto debe ser 0 y el valor del
 * trabajo queda como saldo pendiente de la orden.
 *
 * Hasta agosto de 2026 nada obligaba ese 0: el formulario conservaba el monto
 * escrito y la validación del DTO (`@ValidateIf(method !== CREDIT)`, que es a
 * nivel de propiedad) desactivaba TODOS los validadores del monto para CREDIT.
 * Registrar el crédito con el valor del trabajo producía tres daños:
 *
 *   1. `paidAmount = total` → la OP aparece pagada sin que entre un peso.
 *   2. Un `CashMovement` de INCOME por ese monto → ingreso falso en el arqueo.
 *   3. Al cobrar de verdad, el abono real se suma encima → pago duplicado y un
 *      "saldo a favor" que el cliente nunca tuvo.
 *
 * En producción: 30 pagos por $1.994.500 y $1.876.600 de ingreso falso en caja.
 *
 * Qué hace
 * --------
 * Por cada pago CREDIT con monto > 0:
 *   - pone `amount = 0` (el pago sobrevive como evidencia del acuerdo de crédito);
 *   - anula su `CashMovement` (`isVoided`, sin contramovimiento y sin reabrir la
 *     sesión: ver el modelo de anulación de caja) y suelta el vínculo;
 *   - recalcula `paidAmount` (= suma de pagos − `refundedAmount`) y `balance`
 *     de la orden con los mismos helpers que usa el servicio.
 *
 * Opcionalmente (`--clean-zero-movements`) anula también los movimientos de $0
 * que generaron los créditos bien registrados: no afectan el saldo, pero
 * ensucian el arqueo. 122 en producción.
 *
 * Por qué no se reabre la sesión original
 * ---------------------------------------
 * Al cerrar una sesión, `closingAmount`/`systemBalance`/`discrepancy` quedan
 * congelados. La anulación administrativa (solo `isVoided`) es el patrón ya
 * usado en `updatePayment` para el mismo caso: neutraliza el saldo sin tocar
 * el arqueo firmado, y deja el motivo visible en la exportación de la sesión.
 *
 * Qué NO hace
 * -----------
 * No cobra nada ni aplica saldos a favor. Después de correrlo, las OPs quedan
 * con su saldo real pendiente y el cobro se registra desde la UI como un pago
 * nuevo (o con el método "Saldo a favor" si el dinero ya entró en otra OP).
 *
 * Uso
 * ---
 *   npx ts-node scripts/sanitize-credit-payments.ts                       # dry-run sobre .env.development
 *   npx ts-node scripts/sanitize-credit-payments.ts --env=production
 *   npx ts-node scripts/sanitize-credit-payments.ts --env=production --apply
 *   npx ts-node scripts/sanitize-credit-payments.ts --env=production --apply --orders=OP-2026-0852,OP-2026-1279
 *
 * Opciones
 *   --apply                   escribe (por defecto solo simula)
 *   --env=<nombre>            archivo .env.<nombre> del que leer DATABASE_URL
 *   --orders=OP-1,OP-2        limita el saneamiento a esas órdenes
 *   --clean-zero-movements    anula además los movimientos de $0 de créditos correctos
 *
 * Es idempotente: filtra por `amount > 0`, así que volver a correrlo no hace nada.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient, Prisma } from '../src/generated/prisma';
import {
  computeNetPaidAmount,
  computeOrderBalance,
} from '../src/common/utils/order-balance.util';

const APPLY = process.argv.includes('--apply');
const CLEAN_ZERO = process.argv.includes('--clean-zero-movements');
const ENV =
  process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ??
  'development';
const ONLY_ORDERS = (
  process.argv.find((a) => a.startsWith('--orders='))?.split('=')[1] ?? ''
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const VOID_REASON =
  'Pago a crédito registrado con monto: el crédito no ingresa dinero a caja, ' +
  'el valor queda como saldo pendiente de la orden';

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
 * Usuario al que se atribuye la anulación. Se toma el admin más antiguo: la
 * anulación es un asiento administrativo, no la acción de un cajero.
 */
async function resolveActorId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: { name: { in: ['admin', 'Admin', 'ADMIN'] } } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (admin) return admin.id;

  const anyUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!anyUser) throw new Error('No hay usuarios en la base de datos');
  return anyUser.id;
}

async function main() {
  console.log(`Ambiente: ${ENV}`);
  console.log(APPLY ? '=== MODO APLICAR ===' : '=== DRY-RUN (sin cambios) ===');
  if (ONLY_ORDERS.length > 0) {
    console.log(`Limitado a: ${ONLY_ORDERS.join(', ')}`);
  }
  console.log('');

  const bad = await prisma.payment.findMany({
    where: {
      paymentMethod: 'CREDIT',
      amount: { gt: 0 },
      ...(ONLY_ORDERS.length > 0
        ? { order: { orderNumber: { in: ONLY_ORDERS } } }
        : {}),
    },
    select: {
      id: true,
      amount: true,
      cashMovementId: true,
      order: { select: { id: true, orderNumber: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (ONLY_ORDERS.length > 0) {
    const encontradas = new Set(bad.map((p) => p.order.orderNumber));
    const faltantes = ONLY_ORDERS.filter((o) => !encontradas.has(o));
    if (faltantes.length > 0) {
      console.log(
        `ℹ️  Sin pago CREDIT con monto (nada que sanear): ${faltantes.join(', ')}\n`,
      );
    }
  }

  if (bad.length === 0) {
    console.log('No hay pagos a crédito con monto. Nada que hacer.');
  } else {
    const actorId = await resolveActorId();
    let totalLiberado = new Prisma.Decimal(0);

    for (const p of bad) {
      // Una transacción por orden: son pocas y así un fallo no deja a medias el
      // recálculo de otra.
      await prisma.$transaction(
        async (tx) => {
          const orderId = p.order.id;

          if (APPLY) {
            await tx.payment.update({
              where: { id: p.id },
              data: { amount: new Prisma.Decimal(0), pendingCashEntry: false },
            });

            if (p.cashMovementId) {
              await tx.cashMovement.update({
                where: { id: p.cashMovementId },
                data: {
                  isVoided: true,
                  voidedById: actorId,
                  voidedAt: new Date(),
                  voidReason: VOID_REASON,
                },
              });
              await tx.payment.update({
                where: { id: p.id },
                data: { cashMovementId: null },
              });
            }
          }

          // Recalcular con los pagos ya corregidos (en dry-run se simula
          // restando el monto malo, que es lo que haría el UPDATE).
          const agg = await tx.payment.aggregate({
            where: { orderId },
            _sum: { amount: true },
          });
          const sumaPagos = APPLY
            ? new Prisma.Decimal(agg._sum.amount ?? 0)
            : new Prisma.Decimal(agg._sum.amount ?? 0).sub(p.amount);

          const order = await tx.order.findUniqueOrThrow({
            where: { id: orderId },
            select: {
              total: true,
              refundedAmount: true,
              appliedCreditAmount: true,
              paidAmount: true,
              balance: true,
            },
          });

          const paidAmount = computeNetPaidAmount(
            sumaPagos,
            order.refundedAmount,
          );
          const balance = computeOrderBalance(
            order.total,
            paidAmount,
            order.appliedCreditAmount,
          );

          if (APPLY) {
            await tx.order.update({
              where: { id: orderId },
              data: { paidAmount, balance },
            });
          }

          totalLiberado = totalLiberado.add(p.amount);

          console.log(
            `  ${p.order.orderNumber.padEnd(14)} crédito ${money(p.amount).padStart(14)}  ` +
              `saldo ${money(order.balance)} → ${money(balance)}` +
              (p.cashMovementId ? '  · movimiento de caja anulado' : ''),
          );
        },
        { timeout: 60_000, maxWait: 30_000 },
      );
    }

    console.log(
      `\n${APPLY ? '✅' : '🔎'} ${bad.length} pagos a crédito por ${money(totalLiberado)} ` +
        `${APPLY ? 'saneados' : 'a sanear'}: ese saldo vuelve a figurar como pendiente.`,
    );
  }

  // Los créditos bien registrados ($0) igual generaban un movimiento de caja de
  // $0: no mueven el arqueo, pero lo llenan de ruido.
  if (CLEAN_ZERO) {
    const zeroMovs = await prisma.payment.findMany({
      where: {
        paymentMethod: 'CREDIT',
        amount: 0,
        cashMovementId: { not: null },
        cashMovement: { isVoided: false },
      },
      select: { id: true, cashMovementId: true },
    });

    console.log(
      `\n${zeroMovs.length} movimientos de caja de $0 por créditos correctos.`,
    );

    if (APPLY && zeroMovs.length > 0) {
      const actorId = await resolveActorId();
      await prisma.$transaction(
        async (tx) => {
          await tx.cashMovement.updateMany({
            where: {
              id: { in: zeroMovs.map((p) => p.cashMovementId!) },
            },
            data: {
              isVoided: true,
              voidedById: actorId,
              voidedAt: new Date(),
              voidReason:
                'Movimiento de $0 generado por un pago a crédito: el crédito no mueve caja',
            },
          });
          await tx.payment.updateMany({
            where: { id: { in: zeroMovs.map((p) => p.id) } },
            data: { cashMovementId: null },
          });
        },
        { timeout: 120_000, maxWait: 30_000 },
      );
      console.log('✅ Anulados.');
    }
  }

  const quedan = await prisma.payment.count({
    where: { paymentMethod: 'CREDIT', amount: { gt: 0 } },
  });
  console.log(
    `\nPagos a crédito con monto restantes: ${quedan}${APPLY ? ' (debe ser 0)' : ''}.`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
