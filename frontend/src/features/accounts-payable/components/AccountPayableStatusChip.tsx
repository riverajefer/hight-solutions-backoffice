import React from 'react';
import { Chip } from '@mui/material';
import type { AccountPayableStatus } from '../../../types/accounts-payable.types';
import { ACCOUNT_PAYABLE_STATUS_CONFIG } from '../../../types/accounts-payable.types';

interface AccountPayableStatusChipProps {
  status: AccountPayableStatus;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

export const AccountPayableStatusChip: React.FC<AccountPayableStatusChipProps> = ({
  status,
  size = 'small',
  variant = 'filled',
}) => {
  const config = ACCOUNT_PAYABLE_STATUS_CONFIG[status];

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant={variant}
      sx={{ fontWeight: 500, minWidth: size === 'small' ? 80 : 100 }}
    />
  );
};
