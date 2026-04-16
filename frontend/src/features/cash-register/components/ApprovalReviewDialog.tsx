import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { advancePaymentApprovalsApi } from '../../../api/advance-payment-approvals.api';
import type { AdvancePaymentApproval } from '../../../types/advance-payment-approval.types';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
  CREDIT: 'Crédito',
  OTHER: 'Otro',
};

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(value));

interface ApprovalReviewDialogProps {
  open: boolean;
  approval: AdvancePaymentApproval | null;
  action: 'approve' | 'reject';
  onClose: () => void;
}

const ApprovalReviewDialog: React.FC<ApprovalReviewDialogProps> = ({
  open,
  approval,
  action,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (open) setReviewNotes('');
  }, [open]);

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      advancePaymentApprovalsApi.approve(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advancePaymentApprovals'] });
      enqueueSnackbar('Anticipo aprobado exitosamente', { variant: 'success' });
      onClose();
    },
    onError: () => {
      enqueueSnackbar('Error al aprobar. La solicitud puede haber sido procesada por otro usuario.', { variant: 'error' });
      queryClient.invalidateQueries({ queryKey: ['advancePaymentApprovals'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      advancePaymentApprovalsApi.reject(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advancePaymentApprovals'] });
      enqueueSnackbar('Anticipo rechazado', { variant: 'warning' });
      onClose();
    },
    onError: () => {
      enqueueSnackbar('Error al rechazar. La solicitud puede haber sido procesada por otro usuario.', { variant: 'error' });
      queryClient.invalidateQueries({ queryKey: ['advancePaymentApprovals'] });
    },
  });

  const isLoading = approveMutation.isPending || rejectMutation.isPending;
  const isReject = action === 'reject';

  const handleConfirm = () => {
    if (!approval) return;

    if (isReject && !reviewNotes.trim()) return;

    const payload = { id: approval.id, notes: reviewNotes.trim() || undefined };

    if (isReject) {
      rejectMutation.mutate(payload);
    } else {
      approveMutation.mutate(payload);
    }
  };

  if (!approval) return null;

  const requesterName =
    [approval.requestedBy.firstName, approval.requestedBy.lastName].filter(Boolean).join(' ') ||
    approval.requestedBy.email;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {isReject ? 'Rechazar Anticipo' : 'Aprobar Anticipo'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Orden: <strong>{approval.order.orderNumber}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Solicitado por: <strong>{requesterName}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Método: <strong>{PAYMENT_METHOD_LABELS[approval.payment.paymentMethod] || approval.payment.paymentMethod}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monto: <strong>{formatCurrency(approval.payment.amount)}</strong>
          </Typography>
        </Box>

        {isReject && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Al rechazar, el pago será eliminado y el saldo de la orden será revertido.
          </Alert>
        )}

        <TextField
          label={isReject ? 'Motivo del rechazo (requerido)' : 'Notas (opcional)'}
          multiline
          rows={2}
          fullWidth
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          required={isReject}
          error={isReject && reviewNotes.trim() === ''}
          helperText={isReject && reviewNotes.trim() === '' ? 'Debe indicar un motivo de rechazo' : ''}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color={isReject ? 'error' : 'success'}
          onClick={handleConfirm}
          disabled={isLoading || (isReject && !reviewNotes.trim())}
          startIcon={isReject ? <CancelIcon /> : <CheckCircleIcon />}
        >
          {isLoading ? 'Procesando...' : isReject ? 'Rechazar' : 'Aprobar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApprovalReviewDialog;
