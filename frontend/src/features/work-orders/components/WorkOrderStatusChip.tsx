import { Chip } from '@mui/material';
import { WorkOrderStatus, WORK_ORDER_STATUS_CONFIG } from '../../../types/work-order.types';

interface WorkOrderStatusChipProps {
  status: WorkOrderStatus | string;
  size?: 'small' | 'medium';
}

export const WorkOrderStatusChip = ({ status, size = 'small' }: WorkOrderStatusChipProps) => {
  const config = WORK_ORDER_STATUS_CONFIG[status as WorkOrderStatus];

  if (!config) {
    return <Chip label={status} size={size} />;
  }

  return <Chip label={config.label} color={config.color} size={size} />;
};
