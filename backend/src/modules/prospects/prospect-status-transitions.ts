import { ProspectStatus } from '../../generated/prisma';

/**
 * Flujo del pipeline comercial:
 *
 *   NUEVO → EN_SEGUIMIENTO → COTIZADO → CONVERTIDO
 *      ↘         ↘              ↘
 *       PERDIDO / NO_INTERESADO (terminales)
 *
 * A diferencia de las cotizaciones, aquí se permite volver de COTIZADO a
 * EN_SEGUIMIENTO: es común que un cliente pida precios, no responda, y la
 * vendedora lo retome semanas después.
 */
export const ALLOWED_PROSPECT_TRANSITIONS: Record<ProspectStatus, ProspectStatus[]> = {
  [ProspectStatus.NUEVO]: [
    ProspectStatus.EN_SEGUIMIENTO,
    ProspectStatus.COTIZADO,
    ProspectStatus.PERDIDO,
    ProspectStatus.NO_INTERESADO,
  ],
  [ProspectStatus.EN_SEGUIMIENTO]: [
    ProspectStatus.COTIZADO,
    ProspectStatus.CONVERTIDO,
    ProspectStatus.PERDIDO,
    ProspectStatus.NO_INTERESADO,
  ],
  [ProspectStatus.COTIZADO]: [
    ProspectStatus.CONVERTIDO,
    ProspectStatus.EN_SEGUIMIENTO,
    ProspectStatus.PERDIDO,
    ProspectStatus.NO_INTERESADO,
  ],
  [ProspectStatus.CONVERTIDO]: [],
  [ProspectStatus.PERDIDO]: [ProspectStatus.EN_SEGUIMIENTO],
  [ProspectStatus.NO_INTERESADO]: [ProspectStatus.EN_SEGUIMIENTO],
};

export function isValidProspectTransition(
  current: ProspectStatus,
  next: ProspectStatus,
): boolean {
  if (current === next) return true;
  return ALLOWED_PROSPECT_TRANSITIONS[current]?.includes(next) ?? false;
}

export function getValidNextProspectStatuses(
  current: ProspectStatus,
): ProspectStatus[] {
  return ALLOWED_PROSPECT_TRANSITIONS[current] || [];
}
