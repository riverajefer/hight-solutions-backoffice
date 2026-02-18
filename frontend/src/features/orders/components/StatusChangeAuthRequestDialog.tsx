import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { orderStatusChangeRequestsApi } from '../../../api/order-status-change-requests.api';
import type { Order, OrderStatus } from '../../../types/order.types';
import { ORDER_STATUS_CONFIG } from '../../../types/order.types';

interface StatusChangeAuthRequestDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  requestedStatus: OrderStatus;
}

export const StatusChangeAuthRequestDialog: React.FC<StatusChangeAuthRequestDialogProps> = ({
  open,
  onClose,
  order,
  requestedStatus,
}) => {
  const [reason, setReason] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const createRequestMutation = useMutation({
    mutationFn: orderStatusChangeRequestsApi.create,
    onSuccess: () => {
      enqueueSnackbar(
        'Solicitud enviada exitosamente. Espere la aprobación de un administrador.',
        { variant: 'success' }
      );
      handleClose();
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al crear solicitud',
        { variant: 'error' }
      );
    },
  });

  const handleSubmit = () => {
    if (!reason.trim()) {
      enqueueSnackbar('Por favor ingrese una razón para el cambio', { variant: 'warning' });
      return;
    }

    createRequestMutation.mutate({
      orderId: order.id,
      currentStatus: order.status,
      requestedStatus,
      reason: reason.trim(),
    });
  };

  const handleClose = () => {
    if (!createRequestMutation.isPending) {
      setReason('');
      onClose();
    }
  };

  const currentStatusLabel = ORDER_STATUS_CONFIG[order.status]?.label || order.status;
  const requestedStatusLabel = ORDER_STATUS_CONFIG[requestedStatus]?.label || requestedStatus;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Solicitar Autorización de Cambio de Estado</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Este cambio de estado requiere autorización de un administrador.
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Orden:</strong> {order.orderNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Estado actual:</strong> {currentStatusLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Estado solicitado:</strong> {requestedStatusLabel}
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Razón del cambio *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explique por qué necesita cambiar el estado de esta orden..."
          disabled={createRequestMutation.isPending}
          helperText="Este campo es obligatorio"
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={createRequestMutation.isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={createRequestMutation.isPending || !reason.trim()}
        >
          {createRequestMutation.isPending ? (
            <CircularProgress size={24} />
          ) : (
            'Enviar Solicitud'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
