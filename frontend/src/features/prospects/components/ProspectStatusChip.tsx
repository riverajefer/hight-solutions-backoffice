import React from 'react';
import { Chip } from '@mui/material';
import {
  PROSPECT_STATUS_COLORS,
  PROSPECT_STATUS_LABELS,
  ProspectStatus,
} from '../../../types/prospect.types';

interface ProspectStatusChipProps {
  status: ProspectStatus;
  size?: 'small' | 'medium';
}

export const ProspectStatusChip: React.FC<ProspectStatusChipProps> = ({
  status,
  size = 'small',
}) => (
  <Chip
    label={PROSPECT_STATUS_LABELS[status]}
    color={PROSPECT_STATUS_COLORS[status]}
    size={size}
    variant="filled"
  />
);
