import React from 'react';
import { Chip } from '@mui/material';
import type { OrderStatus } from '../../../types/order.types';
import { ORDER_STATUS_CONFIG } from '../../../types/order.types';

interface OrderStatusChipProps {
  status: OrderStatus;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

export const OrderStatusChip: React.FC<OrderStatusChipProps> = ({
  status,
  size = 'small',
  variant = 'filled',
}) => {
  const config = ORDER_STATUS_CONFIG[status];

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant={variant}
      sx={{
        fontWeight: 500,
        minWidth: size === 'small' ? 80 : 100,
      }}
    />
  );
};
