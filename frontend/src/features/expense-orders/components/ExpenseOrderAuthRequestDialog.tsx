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
import { expenseOrderAuthRequestsApi } from '../../../api/expense-order-auth-requests.api';
import { EXPENSE_ORDER_STATUS_CONFIG, ExpenseOrderStatus } from '../../../types/expense-order.types';

interface ExpenseOrderAuthRequestDialogProps {
  open: boolean;
  onClose: () => void;
  expenseOrder: {
    id: string;
    ogNumber: string;
    status: ExpenseOrderStatus;
  };
}

export const ExpenseOrderAuthRequestDialog: React.FC<ExpenseOrderAuthRequestDialogProps> = ({
  open,
  onClose,
  expenseOrder,
}) => {
  const [reason, setReason] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const createRequestMutation = useMutation({
    mutationFn: expenseOrderAuthRequestsApi.create,
    onSuccess: () => {
      enqueueSnackbar(
        'Solicitud enviada exitosamente. Espere la aprobación de un administrador.',
        { variant: 'success' },
      );
      setReason('');
      onClose();
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al crear solicitud',
        { variant: 'error' },
      );
    },
  });

  const handleSubmit = () => {
    if (!reason.trim()) {
      enqueueSnackbar('Por favor ingrese una razón para el cambio', { variant: 'warning' });
      return;
    }

    createRequestMutation.mutate({
      expenseOrderId: expenseOrder.id,
      reason: reason.trim(),
    });
  };

  const handleClose = () => {
    if (!createRequestMutation.isPending) {
      setReason('');
      onClose();
    }
  };

  const currentStatusLabel =
    EXPENSE_ORDER_STATUS_CONFIG[expenseOrder.status]?.label || expenseOrder.status;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Solicitar Autorización de OG</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Cambiar el estado a <strong>"Autorizada"</strong> requiere aprobación de un administrador.
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>OG:</strong> {expenseOrder.ogNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Estado actual:</strong> {currentStatusLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Estado solicitado:</strong>{' '}
            {EXPENSE_ORDER_STATUS_CONFIG[ExpenseOrderStatus.AUTHORIZED].label}
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Razón del cambio *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explique por qué necesita autorizar esta orden de gasto..."
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
