import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import type { AccountPayablePaymentAuthRequest } from '../../../types/accounts-payable.types';
import { formatCurrency, formatDate } from '../../../utils/formatters';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia Bancaria',
  CHECK: 'Cheque',
  CREDIT_CARD: 'Tarjeta de Crédito',
  DEBIT_CARD: 'Tarjeta Débito',
  OTHER: 'Otro',
};

interface Props {
  open: boolean;
  onClose: () => void;
  request: AccountPayablePaymentAuthRequest;
  onApprove: () => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  loading: boolean;
}

export const CajaApprovePaymentDialog: React.FC<Props> = ({
  open,
  onClose,
  request,
  onApprove,
  onReject,
  loading,
}) => {
  const [mode, setMode] = useState<'view' | 'reject'>('view');
  const [rejectReason, setRejectReason] = useState('');

  const handleClose = () => {
    if (!loading) {
      setMode('view');
      setRejectReason('');
      onClose();
    }
  };

  const handleApprove = async () => {
    await onApprove();
    handleClose();
  };

  const handleReject = async () => {
    await onReject(rejectReason || undefined);
    handleClose();
  };

  const requesterName =
    [request.requestedBy.firstName, request.requestedBy.lastName].filter(Boolean).join(' ') ||
    request.requestedBy.email;
  const methodLabel = PAYMENT_METHOD_LABELS[request.paymentMethod] ?? request.paymentMethod;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Autorización de Pago — Caja</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Esta solicitud fue aprobada por el administrador. Revisa los detalles y registra el
          pago para completar el proceso.
        </Alert>

        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <InfoItem label="Monto" value={formatCurrency(request.amount)} />
            <InfoItem label="Método de pago" value={methodLabel} />
            <InfoItem label="Fecha de pago" value={formatDate(request.paymentDate)} />
            {request.reference && (
              <InfoItem label="Referencia / Comprobante" value={request.reference} />
            )}
          </Box>

          {request.reason && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Justificación del solicitante
              </Typography>
              <Typography variant="body2">{request.reason}</Typography>
            </Box>
          )}

          {request.notes && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Notas adicionales
              </Typography>
              <Typography variant="body2">{request.notes}</Typography>
            </Box>
          )}

          {request.adminNotes && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Notas del administrador
              </Typography>
              <Typography variant="body2">{request.adminNotes}</Typography>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary">
            Solicitado por: <strong>{requesterName}</strong>
          </Typography>

          {mode === 'reject' && (
            <>
              <Divider />
              <TextField
                label="Razón del rechazo (opcional)"
                multiline
                rows={2}
                fullWidth
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        {mode === 'view' ? (
          <>
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setMode('reject')}
              disabled={loading}
            >
              Rechazar
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
              onClick={handleApprove}
              disabled={loading}
            >
              Aprobar y Registrar Pago
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setMode('view')} disabled={loading}>
              Volver
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={loading ? <CircularProgress size={16} /> : <CancelIcon />}
              onClick={handleReject}
              disabled={loading}
            >
              Confirmar Rechazo
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
}
