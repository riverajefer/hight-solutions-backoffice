import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { SupplyLotDisplayStatus } from '../../../types';

const CONFIG: Record<SupplyLotDisplayStatus, { label: string; color: ChipProps['color'] }> = {
  AVAILABLE: { label: 'Disponible', color: 'success' },
  LOW: { label: 'Bajo inventario', color: 'warning' },
  DEPLETED: { label: 'Agotado', color: 'default' },
  CLOSED: { label: 'Cerrado', color: 'default' },
  VOIDED: { label: 'Anulado', color: 'error' },
};

export const SupplyLotStatusChip: React.FC<{ status: SupplyLotDisplayStatus; size?: ChipProps['size'] }> = ({
  status,
  size = 'small',
}) => {
  const { label, color } = CONFIG[status];
  return (
    <Chip
      label={label}
      color={color}
      size={size}
      variant={status === 'DEPLETED' || status === 'CLOSED' ? 'outlined' : 'filled'}
    />
  );
};
