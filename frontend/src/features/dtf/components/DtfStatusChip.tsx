import { Chip } from '@mui/material';
import type { DtfStatus } from '../../../types/dtf.types';

const STATUS_CONFIG: Record<DtfStatus, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'secondary' }> = {
  BORRADOR: { label: 'Borrador', color: 'default' },
  ENVIADA: { label: 'Enviada', color: 'info' },
  EN_IMPRESION: { label: 'En Impresión', color: 'warning' },
  COMPLETADA: { label: 'Completada', color: 'success' },
  CONVERTIDA_EN_OP: { label: 'Convertida en OP', color: 'secondary' },
};

interface DtfStatusChipProps {
  status: DtfStatus;
  size?: 'small' | 'medium';
}

export const DtfStatusChip = ({ status, size = 'small' }: DtfStatusChipProps) => {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'default' as const };
  return <Chip label={config.label} color={config.color} size={size} />;
};
