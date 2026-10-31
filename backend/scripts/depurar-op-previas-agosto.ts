/**
 * Depuración de las OP anteriores al arranque formal del CRM (1-ago-2026).
 *
 * Contexto
 * --------
 * El cliente pidió que las OP de la etapa de pruebas que nunca llegaron a pagadas
 * y entregadas dejen de sumar en cartera, producción y demás procesos, sin
 * borrarlas. En producción, a octubre de 2026, son 1.007 OP. La lista se valida
 * con él en `docs/OP_PREVIAS_AGOSTO_VALIDACION_CLIENTE.xlsx`, y este script
 * ejecuta exactamente lo que decidió ahí, OP por OP.
 *
 * Qué hace cada decisión
 * ----------------------
 * - Anular: pone la OP en `ANULADO` reteniendo todo lo que permite
 *   `computeMaxRetainableOnAnnul`, y cancela sus OT y órdenes de producción. Sin
 *   la retención, lo pagado quedaría como saldo a favor gastable: un `annulOrder`
 *   con retenido 0, repetido sobre esta lista, regalaría hasta $107,8M.
 * - Pasar a Entregada: pone la OP en `DELIVERED` y completa sus OT y órdenes de
 *   producción. Solo admite OP sin saldo, porque con saldo seguiría en cartera.
 *   Completa las OT sin descontar inventario: son trabajos de hace meses y su
 *   salida de insumos no corresponde al stock de hoy. Al quedar entregada y
 *   pagada, la OP empieza a contar como comisionable.
 * - Mantener: no toca nada.
 *
 * **No mueve dinero.** No crea, anula ni modifica pagos ni `CashMovement`, así que
 * los arqueos quedan igual. Tampoco toca las OG amarradas: se listan al final
 * porque su destino lo define el cliente aparte.
 *
 * Qué bloquea una OP
 * ------------------
 * Cualquier OP modificada desde `--corte` se salta: el cliente decidió con cifras
 * que ya no son las de hoy. También las que estén fuera del universo, o que tengan
 * pagos pendientes de Caja, devoluciones, descuentos por nómina vivos, solicitudes
 * de cambio de estado pendientes o temporizadores abiertos. Todo se revalida con
 * la OP bloqueada, justo antes de escribir.
 *
 * Reversa
 * -------
 * `ANULADO` es terminal en la aplicación. Antes de escribir, el script guarda un
 * respaldo junto al CSV con el estado previo de cada OP, OT y orden de producción.
 * `--revertir=<respaldo>` lo restaura en las OP que sigan como las dejó el script.
 *
 * Uso
 * ---
 * Guarda la hoja «OP» del Excel como CSV. Solo se leen «OP» y «Decisión del cliente».
 *
 *   npx ts-node scripts/depurar-op-previas-agosto.ts --file=decisiones.csv --corte=2026-10-30
 *   npx ts-node scripts/depurar-op-previas-agosto.ts --file=decisiones.csv --corte=2026-10-30 --env=staging --apply --confirmar=412
 *   npx ts-node scripts/depurar-op-previas-agosto.ts --revertir=decisiones.respaldo-<fecha>.json --env=staging --apply --confirmar=412
 *
 * Opciones
 *   --file=<ruta>       CSV con las decisiones (separado por coma o punto y coma)
 *   --corte=<fecha>     fecha (AAAA-MM-DD, Bogotá) de los datos con que decidió el cliente
 *   --apply             escribe (por defecto solo simula)
 *   --confirmar=<n>     con --apply, cantidad de cambios que mostró la simulación
 *   --op=<numero>       limita a una sola OP, para probar el efecto en un caso
 *   --env=<nombre>      archivo .env.<nombre> del que leer DATABASE_URL
 *   --usuario=<login>   quien queda en la auditoría (por defecto adminsistema)
 *   --revertir=<ruta>   restaura un respaldo en lugar de aplicar decisiones
 *
 * Es idempotente: una OP que ya está en el estado decidido se salta.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  PrismaClient,
  Prisma,
  OrderStatus,
  ProductionOrderStatus,
  WorkOrderStatus,
} from '../src/generated/prisma';
import {
  computeMaxRetainableOnAnnul,
  computeOrderBalance,
} from '../src/common/utils/order-balance.util';
import { lockOrderForUpdate } from '../src/common/utils/order-lock.util';

const SCRIPT = 'depurar-op-previas-agosto';
const argValue = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const APPLY = process.argv.includes('--apply');
const ENV = argValue('env') ?? 'development';
const FILE = argValue('file');
const CORTE = argValue('corte');
const ONLY_OP = argValue('op');
const REVERTIR = argValue('revertir');
const CONFIRMAR = argValue('confirmar');
const USUARIO = argValue('usuario') ?? 'adminsistema';

/** 1-ago-2026 00:00 en Bogotá: `order_date` se guarda en UTC sin zona. */
const ARRANQUE_CRM = new Date('2026-08-01T05:00:00.000Z');

const ESTADOS_DEPURABLES: OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.CONFIRMED,
  OrderStatus.IN_PRODUCTION,
  OrderStatus.READY,
];

const OT_ABIERTAS: WorkOrderStatus[] = [
  WorkOrderStatus.DRAFT,
  WorkOrderStatus.CONFIRMED,
  WorkOrderStatus.IN_PRODUCTION,
  WorkOrderStatus.READY,
];

const PRODUCCION_ABIERTA: ProductionOrderStatus[] = [
  ProductionOrderStatus.PENDING,
  ProductionOrderStatus.IN_PROGRESS,
];

type Decision = 'ANULAR' | 'ENTREGAR' | 'MANTENER';

const DECISIONES: Record<string, Decision> = {
  anular: 'ANULAR',
  'pasar a entregada': 'ENTREGAR',
  mantener: 'MANTENER',
};

const ESTADO_FINAL = {
  ANULAR: {
    orden: OrderStatus.ANULADO,
    ot: WorkOrderStatus.CANCELLED,
    produccion: ProductionOrderStatus.CANCELLED,
  },
  ENTREGAR: {
    orden: OrderStatus.DELIVERED,
    ot: WorkOrderStatus.COMPLETED,
    produccion: ProductionOrderStatus.COMPLETED,
  },
};

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
    maximumFractionDigits: 0,
  });

function abortar(mensaje: string): never {
  console.error(`❌ ${mensaje}`);
  process.exit(1);
}

/** Excel en español guarda el CSV con punto y coma, y los nombres llevan comas. */
function parseCsv(contenido: string): string[][] {
  const texto = contenido.replace(/^﻿/, '');
  const primeraLinea = texto.split(/\r?\n/, 1)[0];
  const separador = primeraLinea.includes(';') ? ';' : ',';

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === separador) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n') {
      fila.push(campo.replace(/\r$/, ''));
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo || fila.length) filas.push([...fila, campo]);
  return filas;
}

function leerDecisiones(ruta: string): Map<string, Decision> {
  const [encabezado, ...filas] = parseCsv(fs.readFileSync(ruta, 'utf8'));
  // Sin acento a propósito: un CSV en ANSI leído como UTF-8 daña la «ó».
  const colOp = encabezado.findIndex((h) => h.trim().toUpperCase() === 'OP');
  const colDecision = encabezado.findIndex((h) => /^decisi/i.test(h.trim()));
  if (colOp < 0 || colDecision < 0) {
    abortar('El CSV debe traer las columnas «OP» y «Decisión del cliente».');
  }

  const decisiones = new Map<string, Decision>();
  const errores: string[] = [];
  let sinDecidir = 0;

  for (const fila of filas) {
    const numero = fila[colOp]?.trim();
    const texto = fila[colDecision]?.trim().toLowerCase();
    if (!numero) continue;
    if (!texto) {
      sinDecidir++;
      continue;
    }
    if (!DECISIONES[texto]) errores.push(`${numero}: decisión desconocida «${texto}»`);
    if (decisiones.has(numero)) errores.push(`${numero}: aparece dos veces`);
    decisiones.set(numero, DECISIONES[texto]);
  }

  // Una decisión mal escrita invalida la lista: mejor corregirla que ejecutar media.
  if (errores.length > 0) abortar(`El CSV tiene errores:\n  ${errores.join('\n  ')}`);
  console.log(`CSV: ${decisiones.size} decisiones, ${sinDecidir} OP sin decidir (no se tocan).`);
  return decisiones;
}

type Db = Pick<
  Prisma.TransactionClient,
  'order' | 'payrollDeduction' | 'workOrderTimeEntry'
>;

async function leerOrden(db: Db, orderNumber: string) {
  const orden = await db.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      orderDate: true,
      updatedAt: true,
      total: true,
      paidAmount: true,
      appliedCreditAmount: true,
      reversedAmount: true,
      balance: true,
      payments: {
        where: { isVoided: false, pendingCashEntry: true },
        select: { id: true },
      },
      refundRequests: { select: { id: true } },
      statusChangeRequests: { where: { status: 'PENDING' }, select: { id: true } },
      workOrders: {
        select: {
          id: true,
          workOrderNumber: true,
          status: true,
          productionOrders: { select: { id: true, status: true } },
        },
      },
    },
  });
  if (!orden) return null;

  const [descuento, temporizadores] = await Promise.all([
    db.payrollDeduction.findUnique({
      where: { orderId: orden.id },
      select: { status: true },
    }),
    db.workOrderTimeEntry.count({
      where: { endAt: null, workOrder: { orderId: orden.id } },
    }),
  ]);
  return { ...orden, descuento, temporizadores };
}

type Orden = NonNullable<Awaited<ReturnType<typeof leerOrden>>>;

function motivoDeBloqueo(
  orden: Orden,
  decision: Exclude<Decision, 'MANTENER'>,
  corte: Date,
): string | null {
  if (!ESTADOS_DEPURABLES.includes(orden.status)) return `estado ${orden.status}`;
  if (orden.orderDate >= ARRANQUE_CRM) return 'fecha desde el 1-ago-2026';
  if (orden.updatedAt >= corte) return 'modificada desde el corte';
  if (orden.payments.length > 0) return 'pago pendiente de Caja';
  if (orden.refundRequests.length > 0) return 'tiene devoluciones';
  if (orden.statusChangeRequests.length > 0) return 'solicitud de estado pendiente';
  if (orden.temporizadores > 0) return 'temporizador abierto';
  if (orden.descuento && !['REJECTED', 'CANCELLED'].includes(orden.descuento.status)) {
    return `descuento por nómina ${orden.descuento.status}`;
  }
  if (decision === 'ENTREGAR' && new Prisma.Decimal(orden.balance).greaterThan(0)) {
    return 'tiene saldo: seguiría en cartera';
  }
  return null;
}

function otsAbiertas(orden: Orden) {
  return orden.workOrders.filter((w) => OT_ABIERTAS.includes(w.status));
}

function produccionAbierta(orden: Orden) {
  return orden.workOrders.flatMap((w) =>
    w.productionOrders.filter((p) => PRODUCCION_ABIERTA.includes(p.status)),
  );
}

function nuevosValores(orden: Orden, decision: Exclude<Decision, 'MANTENER'>) {
  if (decision === 'ENTREGAR') {
    return {
      retenido: null,
      reversedAmount: new Prisma.Decimal(orden.reversedAmount),
      balance: new Prisma.Decimal(orden.balance),
    };
  }
  const retenido = computeMaxRetainableOnAnnul(orden);
  const reversedAmount = new Prisma.Decimal(orden.total).sub(retenido);
  return {
    retenido,
    reversedAmount,
    balance: computeOrderBalance({ ...orden, reversedAmount }),
  };
}

type Respaldo = {
  orderNumber: string;
  orderId: string;
  decision: Exclude<Decision, 'MANTENER'>;
  estadoDejado: OrderStatus;
  status: OrderStatus;
  reversedAmount: string;
  balance: string;
  ots: { id: string; status: WorkOrderStatus }[];
  produccion: { id: string; status: ProductionOrderStatus }[];
};

function respaldoDe(orden: Orden, decision: Exclude<Decision, 'MANTENER'>): Respaldo {
  return {
    orderNumber: orden.orderNumber,
    orderId: orden.id,
    decision,
    estadoDejado: ESTADO_FINAL[decision].orden,
    status: orden.status,
    reversedAmount: String(orden.reversedAmount),
    balance: String(orden.balance),
    ots: otsAbiertas(orden).map(({ id, status }) => ({ id, status })),
    produccion: produccionAbierta(orden),
  };
}

function exigirConfirmacion(cambios: number) {
  if (!APPLY) return;
  if (CONFIRMAR !== String(cambios)) {
    abortar(`Son ${cambios} cambios: confirma con --confirmar=${cambios} para aplicarlos.`);
  }
}

async function actorId() {
  const actor = await prisma.user.findUnique({
    where: { username: USUARIO },
    select: { id: true },
  });
  if (!actor) abortar(`No existe el usuario ${USUARIO}.`);
  return actor!.id;
}

async function aplicar(
  orderNumber: string,
  decision: Exclude<Decision, 'MANTENER'>,
  corte: Date,
  actor: string,
) {
  await prisma.$transaction(async (tx) => {
    const previa = await leerOrden(tx, orderNumber);
    if (!previa) throw new Error('la OP ya no existe');
    await lockOrderForUpdate(tx, previa.id);

    const orden = (await leerOrden(tx, orderNumber))!;
    const bloqueo = motivoDeBloqueo(orden, decision, corte);
    if (bloqueo) throw new Error(bloqueo);

    const destino = ESTADO_FINAL[decision];
    const { retenido, reversedAmount, balance } = nuevosValores(orden, decision);

    await tx.order.update({
      where: { id: orden.id },
      data: { status: destino.orden, reversedAmount, balance },
    });

    const ots = otsAbiertas(orden);
    await tx.workOrder.updateMany({
      where: { id: { in: ots.map((w) => w.id) } },
      data: { status: destino.ot },
    });
    await tx.productionOrder.updateMany({
      where: { id: { in: produccionAbierta(orden).map((p) => p.id) } },
      data: { status: destino.produccion },
    });

    await tx.auditLog.create({
      data: {
        userId: actor,
        recordId: orden.id,
        model: 'Order',
        action: 'SANITIZE_LEGACY_ORDER',
        oldData: {
          status: orden.status,
          reversedAmount: orden.reversedAmount.toString(),
          balance: orden.balance.toString(),
        },
        newData: {
          status: destino.orden,
          reversedAmount: reversedAmount.toString(),
          balance: balance.toString(),
        },
        changedFields: ['status', 'reversedAmount', 'balance'],
        metadata: {
          motivo:
            'Depuración de OP anteriores al arranque del CRM (1-ago-2026), según decisión del cliente.',
          decision,
          retenido: retenido?.toString() ?? null,
          otsActualizadas: ots.map((w) => w.workOrderNumber),
          script: SCRIPT,
        },
      },
    });
  });
}

async function aplicarDecisiones(ruta: string) {
  if (!CORTE || !/^\d{4}-\d{2}-\d{2}$/.test(CORTE)) {
    abortar('Indica --corte=AAAA-MM-DD: la fecha de los datos con que decidió el cliente.');
  }
  // Inicio del día en Bogotá: lo tocado durante el día del corte también se revisa.
  const corte = new Date(`${CORTE}T05:00:00.000Z`);

  let decisiones = leerDecisiones(ruta);
  if (ONLY_OP) {
    if (!decisiones.has(ONLY_OP)) abortar(`${ONLY_OP} no tiene decisión en el CSV.`);
    decisiones = new Map([[ONLY_OP, decisiones.get(ONLY_OP)!]]);
  }

  type Cambio = { orden: Orden; decision: Exclude<Decision, 'MANTENER'> };
  const cambios: Cambio[] = [];
  const bloqueadas: string[] = [];
  let mantenidas = 0;
  let yaAplicadas = 0;

  for (const [orderNumber, decision] of decisiones) {
    if (decision === 'MANTENER') {
      mantenidas++;
      continue;
    }
    const orden = await leerOrden(prisma, orderNumber);
    if (!orden) {
      bloqueadas.push(`${orderNumber}: no existe`);
    } else if (orden.status === ESTADO_FINAL[decision].orden) {
      yaAplicadas++;
    } else {
      const bloqueo = motivoDeBloqueo(orden, decision, corte);
      if (bloqueo) bloqueadas.push(`${orderNumber}: ${bloqueo}`);
      else cambios.push({ orden, decision });
    }
  }

  const resumir = (decision: Exclude<Decision, 'MANTENER'>) => {
    const grupo = cambios.filter((c) => c.decision === decision);
    const suma = (f: (c: Cambio) => Prisma.Decimal.Value) =>
      grupo.reduce((t, c) => t.add(f(c)), new Prisma.Decimal(0));
    return {
      op: grupo.length,
      total: money(suma((c) => c.orden.total)),
      pagado: money(suma((c) => c.orden.paidAmount)),
      retenido: money(suma((c) => nuevosValores(c.orden, decision).retenido ?? 0)),
      saldoEliminado: money(suma((c) => {
        const antes = new Prisma.Decimal(c.orden.balance);
        return antes.greaterThan(0) ? antes.sub(nuevosValores(c.orden, decision).balance) : 0;
      })),
      saldoAFavorQueda: money(suma((c) => {
        const despues = nuevosValores(c.orden, decision).balance;
        return despues.lessThan(0) ? despues.negated() : 0;
      })),
      ots: grupo.reduce((t, c) => t + otsAbiertas(c.orden).length, 0),
      produccion: grupo.reduce((t, c) => t + produccionAbierta(c.orden).length, 0),
    };
  };

  console.log(`\nDecisiones por aplicar en ${ENV}:`);
  console.table({ Anular: resumir('ANULAR'), 'Pasar a Entregada': resumir('ENTREGAR') });
  console.log(`Mantener: ${mantenidas}. Ya aplicadas antes: ${yaAplicadas}.`);

  if (bloqueadas.length > 0) {
    console.log(`\n⚠ ${bloqueadas.length} OP bloqueadas, no se tocan:`);
    bloqueadas.forEach((b) => console.log(`  ${b}`));
  }

  const ogAbiertas = await prisma.expenseOrder.findMany({
    where: {
      status: { not: 'PAID' },
      workOrder: { orderId: { in: cambios.map((c) => c.orden.id) } },
    },
    select: { ogNumber: true, status: true },
    orderBy: { ogNumber: 'asc' },
  });
  if (ogAbiertas.length > 0) {
    console.log(`\n⚠ ${ogAbiertas.length} OG abiertas de estas OP quedan como están:`);
    console.log(`  ${ogAbiertas.map((g) => `${g.ogNumber} (${g.status})`).join(', ')}`);
  }

  if (!APPLY) {
    console.log(`\nSimulación: no se escribió nada. Son ${cambios.length} cambios.`);
    return;
  }
  exigirConfirmacion(cambios.length);

  const actor = await actorId();
  const respaldo = ruta.replace(
    /\.csv$/i,
    `.respaldo-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  fs.writeFileSync(
    respaldo,
    JSON.stringify(cambios.map((c) => respaldoDe(c.orden, c.decision)), null, 2),
  );
  console.log(`\nRespaldo: ${respaldo}`);

  let aplicadas = 0;
  const fallidas: string[] = [];
  for (const { orden, decision } of cambios) {
    try {
      await aplicar(orden.orderNumber, decision, corte, actor);
      aplicadas++;
    } catch (error) {
      fallidas.push(`${orden.orderNumber}: ${(error as Error).message}`);
    }
  }

  console.log(`✅ Aplicadas: ${aplicadas} de ${cambios.length}.`);
  if (fallidas.length > 0) {
    console.log(`❌ ${fallidas.length} sin aplicar:`);
    fallidas.forEach((f) => console.log(`  ${f}`));
    process.exitCode = 1;
  }
}

async function revertir(ruta: string) {
  const entradas: Respaldo[] = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  const seleccion = ONLY_OP ? entradas.filter((e) => e.orderNumber === ONLY_OP) : entradas;

  const pendientes: Respaldo[] = [];
  for (const entrada of seleccion) {
    const orden = await prisma.order.findUnique({
      where: { id: entrada.orderId },
      select: { status: true },
    });
    // Si ya no está como la dejó el script, no se pisa lo que haya pasado después.
    if (orden?.status === entrada.estadoDejado) pendientes.push(entrada);
  }

  console.log(`Por revertir en ${ENV}: ${pendientes.length} de ${seleccion.length} OP del respaldo.`);
  if (!APPLY) {
    console.log('Simulación: no se escribió nada.');
    return;
  }
  exigirConfirmacion(pendientes.length);

  const actor = await actorId();
  for (const e of pendientes) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: e.orderId },
        data: {
          status: e.status,
          reversedAmount: new Prisma.Decimal(e.reversedAmount),
          balance: new Prisma.Decimal(e.balance),
        },
      });
      for (const ot of e.ots) {
        await tx.workOrder.update({ where: { id: ot.id }, data: { status: ot.status } });
      }
      for (const p of e.produccion) {
        await tx.productionOrder.update({ where: { id: p.id }, data: { status: p.status } });
      }
      await tx.auditLog.create({
        data: {
          userId: actor,
          recordId: e.orderId,
          model: 'Order',
          action: 'REVERT_SANITIZE_LEGACY_ORDER',
          newData: { status: e.status, reversedAmount: e.reversedAmount, balance: e.balance },
          metadata: { respaldo: path.basename(ruta), script: SCRIPT },
        },
      });
    });
  }
  console.log(`✅ Revertidas: ${pendientes.length}.`);
}

async function main() {
  console.log(`${APPLY ? 'APLICANDO' : 'SIMULANDO'} sobre ${ENV}.`);
  if (REVERTIR) return revertir(REVERTIR);
  if (!FILE) abortar('Indica --file=<csv> o --revertir=<respaldo>.');
  return aplicarDecisiones(FILE!);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
