import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  TextField,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import type { Order, OrderStatus } from '../../../types/order.types';

interface ChangeStatusDialogProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onConfirm: (newStatus: OrderStatus) => Promise<void>;
  isLoading?: boolean;
}

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'IN_PRODUCTION', label: 'En Producción' },
  { value: 'READY', label: 'Lista' },
  { value: 'DELIVERED', label: 'Entregada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

export const ChangeStatusDialog: React.FC<ChangeStatusDialogProps> = ({
  open,
  order,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');

  React.useEffect(() => {
    if (order && open) {
      setSelectedStatus(order.status);
    }
  }, [order, open]);

  const handleConfirm = async () => {
    if (!selectedStatus || selectedStatus === order?.status) {
      onClose();
      return;
    }

    await onConfirm(selectedStatus);
    onClose();
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedStatus('');
      onClose();
    }
  };

  if (!order) return null;

  const currentStatusLabel =
    ORDER_STATUS_OPTIONS.find((opt) => opt.value === order.status)?.label || order.status;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cambiar Estado de Orden</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Orden: <strong>{order.orderNumber}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Estado actual: <strong>{currentStatusLabel}</strong>
          </Typography>
        </Box>

        <TextField
          select
          fullWidth
          label="Nuevo Estado"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
          disabled={isLoading}
          required
          sx={{ mt: 2 }}
        >
          {ORDER_STATUS_OPTIONS.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
              disabled={option.value === order.status}
            >
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isLoading || !selectedStatus || selectedStatus === order.status}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Cambiar Estado'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
