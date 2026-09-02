import { applyColombianRounding } from '../../../utils/formatters';

/** IVA que el registro DTF traslada a la OP al convertirse. */
export const DTF_IVA_RATE = 0.19;

/**
 * Total que se le cobra al cliente por un registro DTF. Es exactamente el mismo
 * número que tendrá la OP al convertirse: `valor + IVA` con el redondeo
 * comercial colombiano al múltiplo de 100.
 *
 * Cobrar el valor sin redondear (35.000 × 1,19 = 41.650) deja la OP con un
 * saldo de $50 que el cliente ya no debe y que nadie puede saldar, porque el
 * total de la OP sí se redondea a 41.700. Debe coincidir con
 * `computeDtfTotalToCharge` del backend.
 */
export const dtfTotalToCharge = (value: number, applyIva: boolean): number =>
  applyColombianRounding(applyIva ? value * (1 + DTF_IVA_RATE) : value);

/** IVA que se le suma al valor base, ya considerado el redondeo del total. */
export const dtfIvaAmount = (value: number, applyIva: boolean): number =>
  applyIva ? dtfTotalToCharge(value, applyIva) - value : 0;

/** Saldo pendiente del registro DTF: lo que falta por cobrar tras el abono. */
export const dtfPendingBalance = (
  value: number,
  applyIva: boolean,
  abono: number,
): number => dtfTotalToCharge(value, applyIva) - (abono || 0);
