import { DtfStatus } from '../../generated/prisma';

export const DTF_TRANSITIONS: Record<DtfStatus, DtfStatus[]> = {
  BORRADOR: [DtfStatus.ENVIADA],
  ENVIADA: [DtfStatus.EN_IMPRESION, DtfStatus.BORRADOR],
  EN_IMPRESION: [DtfStatus.COMPLETADA],
  COMPLETADA: [DtfStatus.CONVERTIDA_EN_OP],
  CONVERTIDA_EN_OP: [],
};

export function isValidDtfTransition(from: DtfStatus, to: DtfStatus): boolean {
  return DTF_TRANSITIONS[from]?.includes(to) ?? false;
}
