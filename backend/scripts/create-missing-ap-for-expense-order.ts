/**
 * Crea la Cuenta por Pagar espejo que le falta a una Orden de Gasto.
 *
 * Contexto
 * --------
 * Toda OG nace con su CP espejo. El 13 de octubre de 2026, entre las 11:04 y las
 * 14:13 (hora Bogotá), el generador del número de CP quedó atascado en
 * `CP-2026-1000` (ordenaba el número como texto) y toda creación de CP falló con
 * P2002. La OG se guarda antes que su CP y fuera de una transacción, así que
 * las OG creadas en esa ventana quedaron guardadas —y dos de ellas pagadas por
 * Caja— pero sin cuenta por pagar: no aparecen en el módulo de CP.
 *
 * Una OG que sigue sin pagar se arregla sola: `cajaAuthorize` crea la CP si no
 * existe. Las que ya están en `PAID` no vuelven a pasar por ahí; para esas es
 * este script.
 *
 * Qué hace
 * --------
 * Por cada OG indicada, en una sola transacción:
 *   1. Crea la CP con los mismos valores que habría puesto
 *      `AccountsPayableService.createFromExpenseOrder` al nacer la OG: total con
 *      IVA y retenciones (`computeExpenseTotals`), vencimiento a 30 días de la
 *      creación de la OG, y como creador quien creó la OG.
 *   2. Refleja los egresos de caja de la OG como pagos de la CP, igual que
 *      `settleFromExpenseOrderMovements`, y deja saldo y estado calculados.
 *
 * Los dos pasos van juntos a propósito: una CP creada sin sus pagos mostraría
 * el saldo completo de algo que ya se giró, lista para pagarse otra vez.
 *
 * **No mueve dinero.** No crea, anula ni modifica ningún `CashMovement`.
 *
 * Qué NO toca
 * -----------
 * - OG que ya tienen CP (por eso es idempotente: repetirlo no duplica nada).
 * - OG cuyos egresos superan el total de la CP: dejarían el saldo en negativo.
 *   Se reportan y se saltan.
 *
 * Una CP puede quedar en PARTIAL con saldo real: los egresos son por ítem (la
 * base) y el total de la CP incluye IVA.
 *
 * Uso
 * ---
 *   npx ts-node scripts/create-missing-ap-for-expense-order.ts --og=OG-2026-0706,OG-2026-0707                       # dry-run sobre .env.development
 *   npx ts-node scripts/create-missing-ap-for-expense-order.ts --env=production --og=OG-2026-0706,OG-2026-0707
 *   npx ts-node scripts/create-missing-ap-for-expense-order.ts --env=production --og=OG-2026-0706,OG-2026-0707 --apply
 *
 * Opciones
 *   --og=<numeros>  OG a reparar, separadas por coma. Obligatorio: en producción
 *                   hay OG históricas sin CP que nadie ha revisado, y este script
 *                   no decide por ellas.
 *   --apply         escribe (por defecto solo simula)
 *   --env=<nombre>  archivo .env.<nombre> del que leer DATABASE_URL
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient, Prisma, AccountPayableStatus } from '../src/generated/prisma';
import { computeExpenseTotals } from '../src/common/utils/expense-totals.util';

const APPLY = process.argv.includes('--apply');
const ENV =
  process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'development';
const OG_NUMBERS = (process.argv.find((a) => a.startsWith('--og='))?.split('=')[1] ?? '')
  .split(',')
  .map((n) => n.trim())
  .filter(Boolean);

if (OG_NUMBERS.length === 0) {
  console.error('❌ Indica las OG a reparar: --og=OG-2026-0706,OG-2026-0707');
  process.exit(1);
}

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
  // Mismo parseo que `db-query.sh`: `.env.production` entrecomilla con comillas
  // simples y deja un espacio al final.
  const match = fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL\s*=\s*(.+)$/m);
  if (!match) {
    console.error(`❌ ${envPath} no define DATABASE_URL`);
    process.exit(1);
  }
  const url = match[1].trim().replace(/^['"]/, '').replace(/['"]$/, '').trim();
  if (!url) {
    console.error(`❌ ${envPath} define DATABASE_URL vacío`);
    process.exit(1);
  }
  return url;
}

const pool = new Pool({ connectionString: resolveDatabaseUrl(), max: 2 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const money = (v: unknown) =>
  Number(String(v)).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2,
  });

type Caso = Awaited<ReturnType<typeof recolectar>>[number];

async function recolectar() {
  const ordenes = await prisma.expenseOrder.findMany({
    where: { ogNumber: { in: OG_NUMBERS } },
    select: {
      id: true,
      ogNumber: true,
      status: true,
      createdAt: true,
      createdById: true,
      expenseTypeId: true,
      expenseSubcategoryId: true,
      applyIva: true,
      ivaRate: true,
      retefuenteRate: true,
      reteICARate: true,
      reteIVARate: true,
      items: { select: { total: true } },
      accountPayable: { select: { apNumber: true } },
    },
    orderBy: { ogNumber: 'asc' },
  });

  const casos = [];
  for (const og of ordenes) {
    const movimientos = await prisma.cashMovement.findMany({
      where: {
        referenceType: 'EXPENSE_ORDER',
        referenceId: og.id,
        movementType: 'EXPENSE',
        isVoided: false,
        accountPayablePayment: { is: null },
      },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        performedById: true,
        receiptNumber: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const subtotal = og.items.reduce((sum, item) => sum + Number(item.total), 0);
    const total = computeExpenseTotals(subtotal, {
      applyIva: og.applyIva,
      ivaRate: og.ivaRate as unknown as number,
      retefuenteRate: og.retefuenteRate as unknown as number,
      reteICARate: og.reteICARate as unknown as number,
      reteIVARate: og.reteIVARate as unknown as number,
    }).total;

    const totalAmount = new Prisma.Decimal(total);
    const girado = movimientos.reduce(
      (sum, m) => sum.add(m.amount),
      new Prisma.Decimal(0),
    );

    casos.push({ og, movimientos, subtotal, totalAmount, girado });
  }
  return casos;
}

/**
 * Mismo incremento atómico que `ConsecutivesRepository.getNextNumberFromSource`:
 * toma el mayor entre el contador y el máximo numérico real de la tabla, para
 * que el número no choque y el contador de la aplicación quede al día.
 */
async function nextApNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const maxInTable = `
    SELECT COALESCE(MAX(CAST(SUBSTRING("ap_number" FROM '([0-9]+)$') AS INTEGER)), 0)
    FROM "accounts_payable" WHERE "ap_number" LIKE $3
  `;
  const rows = await tx.$queryRawUnsafe<Array<{ last_number: number }>>(
    `
    INSERT INTO consecutives (id, type, prefix, year, last_number, created_at, updated_at)
    VALUES (gen_random_uuid(), 'ACCOUNT_PAYABLE', $1, $2, (${maxInTable}) + 1, NOW(), NOW())
    ON CONFLICT (type) DO UPDATE SET
      last_number = GREATEST(
        CASE WHEN consecutives.year = $2 THEN consecutives.last_number ELSE 0 END,
        (${maxInTable})
      ) + 1,
      year = $2,
      updated_at = NOW()
    RETURNING last_number
    `,
    'CP',
    year,
    `CP-${year}-%`,
  );
  return `CP-${year}-${String(Number(rows[0].last_number)).padStart(4, '0')}`;
}

async function reparar(caso: Caso) {
  const { og, movimientos, subtotal, totalAmount } = caso;

  return prisma.$transaction(async (tx) => {
    const apNumber = await nextApNumber(tx);
    const dueDate = new Date(og.createdAt);
    dueDate.setDate(dueDate.getDate() + 30);

    const ap = await tx.accountPayable.create({
      data: {
        apNumber,
        expenseType: { connect: { id: og.expenseTypeId } },
        expenseSubcategory: { connect: { id: og.expenseSubcategoryId } },
        description: `Orden de Gasto ${og.ogNumber}`,
        subtotalAmount: subtotal,
        totalAmount,
        paidAmount: 0,
        balance: totalAmount,
        applyIva: og.applyIva,
        ivaRate: og.ivaRate,
        retefuenteRate: og.retefuenteRate,
        reteICARate: og.reteICARate,
        reteIVARate: og.reteIVARate,
        dueDate,
        isRecurring: false,
        status: AccountPayableStatus.PENDING,
        createdBy: { connect: { id: og.createdById } },
        expenseOrder: { connect: { id: og.id } },
      },
      select: { id: true },
    });

    let status: AccountPayableStatus = AccountPayableStatus.PENDING;

    if (movimientos.length > 0) {
      for (const mov of movimientos) {
        await tx.accountPayablePayment.create({
          data: {
            accountPayableId: ap.id,
            amount: mov.amount,
            paymentMethod: mov.paymentMethod,
            paymentDate: mov.createdAt,
            reference: mov.receiptNumber,
            notes:
              'Pago registrado en la autorización de Caja de la Orden de Gasto ' +
              `${og.ogNumber} (recibo ${mov.receiptNumber})`,
            registeredById: mov.performedById,
            cashMovementId: mov.id,
          },
        });
      }

      const paidAmount = caso.girado;
      const balance = totalAmount.sub(paidAmount);
      status = balance.lessThanOrEqualTo(0)
        ? AccountPayableStatus.PAID
        : AccountPayableStatus.PARTIAL;

      await tx.accountPayable.update({
        where: { id: ap.id },
        data: { paidAmount, balance, status },
      });
    }

    return { apNumber, status };
  });
}

async function main() {
  console.log(`Ambiente: ${ENV}`);
  console.log(APPLY ? '=== MODO APLICAR ===' : '=== DRY-RUN (sin cambios) ===');
  console.log(`OG pedidas: ${OG_NUMBERS.join(', ')}\n`);

  const casos = await recolectar();

  const encontradas = new Set(casos.map((c) => c.og.ogNumber));
  for (const numero of OG_NUMBERS) {
    if (!encontradas.has(numero)) console.log(`⚠️  ${numero}: no existe. Se salta.`);
  }

  const reparables: Caso[] = [];
  for (const caso of casos) {
    const { og, movimientos, totalAmount, girado } = caso;
    if (og.accountPayable) {
      console.log(`·  ${og.ogNumber}: ya tiene ${og.accountPayable.apNumber}. Se salta.`);
      continue;
    }
    if (girado.greaterThan(totalAmount)) {
      console.log(
        `⚠️  ${og.ogNumber}: los egresos (${money(girado)}) superan el total de la CP ` +
          `(${money(totalAmount)}). Se salta: revisar a mano.`,
      );
      continue;
    }
    const saldo = totalAmount.sub(girado);
    const destino =
      movimientos.length === 0 ? 'PENDING' : saldo.lessThanOrEqualTo(0) ? 'PAID' : 'PARTIAL';
    console.log(
      `→  ${og.ogNumber} (${og.status}): CP por ${money(totalAmount)}, ` +
        `${movimientos.length} egreso(s) por ${money(girado)} → ${destino}` +
        (saldo.greaterThan(0) ? `, saldo ${money(saldo)}` : ''),
    );
    reparables.push(caso);
  }

  if (reparables.length === 0) {
    console.log('\nNada que reparar.');
    return;
  }

  if (!APPLY) {
    console.log('\nDry-run: no se escribió nada. Repite con --apply para aplicar.');
    return;
  }

  console.log();
  for (const caso of reparables) {
    try {
      const { apNumber, status } = await reparar(caso);
      console.log(`  ✔ ${caso.og.ogNumber} → ${apNumber} (${status})`);
    } catch (error: any) {
      // Cada OG va en su propia transacción: la que falla queda intacta.
      console.error(`  ✘ ${caso.og.ogNumber}: ${error?.message ?? error}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
