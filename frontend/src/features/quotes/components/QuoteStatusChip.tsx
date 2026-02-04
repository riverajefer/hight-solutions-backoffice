import React from 'react';
import { Chip } from '@mui/material';
import { QuoteStatus, QUOTE_STATUS_CONFIG } from '../../../types/quote.types';

interface QuoteStatusChipProps {
  status: QuoteStatus;
  size?: 'small' | 'medium';
}

export const QuoteStatusChip: React.FC<QuoteStatusChipProps> = ({
  status,
  size = 'small',
}) => {
  const config = QUOTE_STATUS_CONFIG[status] || { label: status, color: 'default' };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      sx={{
        fontWeight: 500,
        minWidth: size === 'small' ? 80 : 100,
      }}
    />
  );
};
