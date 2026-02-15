import React, { useState, useMemo } from 'react';
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
  Alert,
} from '@mui/material';
import type { Order, OrderStatus } from '../../../types/order.types';
import { StatusChangeAuthRequestDialog } from './StatusChangeAuthRequestDialog';

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
  { value: 'READY', label: 'Lista para entrega' },
  { value: 'DELIVERED', label: 'Entregada' },
  { value: 'DELIVERED_ON_CREDIT', label: 'Entregado a Crédito' },
  { value: 'WARRANTY', label: 'Garantía' },
  { value: 'RETURNED', label: 'Devolución' },
  { value: 'PAID', label: 'Pagada' },
];

export const ChangeStatusDialog: React.FC<ChangeStatusDialogProps> = ({
  open,
  order,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [showAuthRequestDialog, setShowAuthRequestDialog] = useState(false);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);

  React.useEffect(() => {
    if (order && open) {
      setSelectedStatus(order.status);
      setAuthorizationError(null);
    }
  }, [order, open]);

  // Validar si el cambio de estado es permitido
  const statusValidation = useMemo(() => {
    if (!order || !selectedStatus || selectedStatus === order.status) {
      return { allowed: true, reason: null };
    }

    const balance = parseFloat(order.balance);

    // Validación de saldo para PAID y DELIVERED
    if (selectedStatus === 'PAID' || selectedStatus === 'DELIVERED') {
      if (balance > 0) {
        const statusLabel = selectedStatus === 'PAID' ? 'PAGADA' : 'ENTREGADA';
        return {
          allowed: false,
          reason: `No se puede cambiar al estado ${statusLabel} con saldo pendiente ($${order.balance}). Use el estado "Entregado a Crédito" o complete los pagos primero.`,
        };
      }
    }

    return { allowed: true, reason: null };
  }, [order, selectedStatus]);

  const handleConfirm = async () => {
    if (!selectedStatus || selectedStatus === order?.status) {
      onClose();
      return;
    }

    try {
      await onConfirm(selectedStatus);
      setAuthorizationError(null);
      onClose();
    } catch (error: any) {
      // Si el error es 403 (Forbidden), significa que requiere autorización
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.message || '';
        if (errorMessage.includes('autorización')) {
          setAuthorizationError(errorMessage);
          setShowAuthRequestDialog(true);
        } else {
          setAuthorizationError(errorMessage);
        }
      } else {
        // Otros errores se propagan normalmente
        throw error;
      }
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedStatus('');
      setAuthorizationError(null);
      onClose();
    }
  };

  const handleAuthRequestClose = () => {
    setShowAuthRequestDialog(false);
    handleClose();
  };

  if (!order) return null;

  const currentStatusLabel =
    ORDER_STATUS_OPTIONS.find((opt) => opt.value === order.status)?.label || order.status;

  return (
    <>
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
            {parseFloat(order.balance) > 0 && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                Saldo pendiente: <strong>${order.balance}</strong>
              </Typography>
            )}
          </Box>

          {authorizationError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {authorizationError}
            </Alert>
          )}

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

          {!statusValidation.allowed && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {statusValidation.reason}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={
              isLoading ||
              !selectedStatus ||
              selectedStatus === order.status ||
              !statusValidation.allowed
            }
          >
            {isLoading ? <CircularProgress size={24} /> : 'Cambiar Estado'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para solicitar autorización */}
      {showAuthRequestDialog && selectedStatus && (
        <StatusChangeAuthRequestDialog
          open={showAuthRequestDialog}
          onClose={handleAuthRequestClose}
          order={order}
          requestedStatus={selectedStatus}
        />
      )}
    </>
  );
};
