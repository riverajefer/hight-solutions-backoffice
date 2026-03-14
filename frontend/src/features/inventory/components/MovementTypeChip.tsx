import React from 'react';
import { Chip } from '@mui/material';
import type { InventoryMovementType } from '../../../types';

interface Props {
  type: InventoryMovementType;
  size?: 'small' | 'medium';
}

const LABELS: Record<InventoryMovementType, string> = {
  ENTRY: 'Entrada',
  EXIT: 'Salida (OT)',
  ADJUSTMENT: 'Ajuste',
  RETURN: 'Devolución',
  INITIAL: 'Inicial',
};

const COLORS: Record<
  InventoryMovementType,
  'success' | 'error' | 'warning' | 'info' | 'default'
> = {
  ENTRY: 'success',
  EXIT: 'error',
  ADJUSTMENT: 'warning',
  RETURN: 'info',
  INITIAL: 'default',
};

export const MovementTypeChip: React.FC<Props> = ({ type, size = 'small' }) => {
  return (
    <Chip
      label={LABELS[type] ?? type}
      color={COLORS[type] ?? 'default'}
      size={size}
      sx={{ fontWeight: 600, fontSize: '0.72rem' }}
    />
  );
};
