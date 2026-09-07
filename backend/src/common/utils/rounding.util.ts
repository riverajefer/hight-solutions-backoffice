import { Prisma } from '../../generated/prisma';

/**
 * Redondeo comercial colombiano al múltiplo de 100 más cercano según regla de
 * denominaciones: los últimos dos dígitos entre 01 y 40 bajan, entre 41 y 99
 * suben. Es la regla con la que se cierra el total de una orden de pedido.
 *
 * Vive aquí y no dentro de `orders.service` porque cualquier módulo que le
 * cobre al cliente antes de que exista la OP (hoy DTF) tiene que cobrar
 * exactamente el mismo número: cuando un módulo redondea y el otro no, el
 * abono queda $50 corto contra el total y la OP nace con un saldo que nadie
 * debe y nadie puede saldar.
 */
export function applyColombianRounding(value: Prisma.Decimal): Prisma.Decimal {
  const truncated = value.toDecimalPlaces(0, Prisma.Decimal.ROUND_DOWN);
  const lastTwo = truncated.mod(100).toNumber();
  if (lastTwo === 0) return truncated;
  if (lastTwo >= 1 && lastTwo <= 40) return truncated.sub(lastTwo);
  return truncated.add(100 - lastTwo);
}

/**
 * Redondea el total al peso entero. Se usa cuando hay retenciones, donde el
 * redondeo comercial a múltiplos de 100 distorsionaría la base del certificado
 * de retención, pero dejar el total con centavos tampoco sirve: el cliente paga
 * pesos enteros y el residuo (0,50) queda como un saldo a favor imposible de
 * saldar. Se redondea igual que `formatCurrency` en el frontend (half-up), para
 * que lo que el asesor ve cobrar sea exactamente el total almacenado.
 */
export function roundToWholePeso(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
}

/** IVA que traslada un registro DTF a la OP al convertirse. */
export const DTF_IVA_RATE = new Prisma.Decimal(0.19);

/**
 * Total que hay que cobrarle al cliente por un registro DTF: es el mismo número
 * que tendrá la OP al convertirse (`subtotal + IVA`, con redondeo comercial),
 * calculado aquí porque el abono se recibe en el mostrador antes de que la OP
 * exista.
 */
export function computeDtfTotalToCharge(
  value: Prisma.Decimal | number | string,
  applyIva: boolean,
): Prisma.Decimal {
  const subtotal = new Prisma.Decimal(value);
  const rawTotal = applyIva ? subtotal.mul(DTF_IVA_RATE.add(1)) : subtotal;
  return applyColombianRounding(rawTotal);
}

/**
 * Normaliza una tasa (IVA, retefuente, ReteICA, ReteIVA) antes de guardarla.
 *
 * El formulario recibe el porcentaje y lo divide entre 100 en JavaScript, donde
 * `1.104 / 100` no es `0.01104` sino `0.011040000000000001`. Ese residuo se
 * guardaba tal cual y después multiplicaba el subtotal, así que el total de la
 * orden terminaba con cola: en producción quedaron totales como
 * `770383.695999999999330`, y con ellos un saldo de `-0.304` que nadie podía
 * saldar.
 *
 * Seis decimales sobran para cualquier tasa real —la más fina que usa el
 * cliente es ReteICA a cuatro— y cortan el ruido de la división en coma
 * flotante. El redondeo del total (`roundToWholePeso`) tapa el síntoma; esto
 * corrige el origen, que además se muestra en el certificado de retención.
 */
export function normalizeRate(
  value: Prisma.Decimal | number | string | null | undefined,
): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value.toString()).toDecimalPlaces(6);
}
