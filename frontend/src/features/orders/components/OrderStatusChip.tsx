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
        width: size === 'small' ? 105 : 120,
        fontSize: size === 'small' ? '0.70rem' : '0.8rem',
        height: size === 'small' ? 20 : 28,
        '& .MuiChip-label': {
          px: size === 'small' ? 0.5 : 1.5,
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          display: 'block',
          width: '100%',
          textAlign: 'center',
        },
      }}
    />
  );
};
