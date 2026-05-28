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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import type { AccountPayablePaymentAuthRequest } from '../../../types/accounts-payable.types';
import { formatCurrency, formatDate } from '../../../utils/formatters';

interface Props {
  open: boolean;
  onClose: () => void;
  authRequest: AccountPayablePaymentAuthRequest;
  onSubmit: (reason: string) => Promise<void>;
  loading: boolean;
}

export const RequestPaymentReversalDialog: React.FC<Props> = ({
  open,
  onClose,
  authRequest,
  onSubmit,
  loading,
}) => {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    if (!loading) {
      setReason('');
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    await onSubmit(reason.trim());
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Solicitar Reversión de Pago</DialogTitle>
      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta acción iniciará el flujo de doble autorización para revertir el pago. Primero
          Gerencia deberá aprobar, luego Caja confirmará y ejecutará la reversión.
        </Alert>

        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Monto</Typography>
              <Typography variant="body2" fontWeight={600} color="error.main">
                {formatCurrency(authRequest.amount)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Fecha de pago</Typography>
              <Typography variant="body2">{formatDate(authRequest.paymentDate)}</Typography>
            </Box>
          </Box>

          <TextField
            label="Motivo de la reversión *"
            multiline
            rows={3}
            fullWidth
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
            placeholder="Describe el error o motivo por el que se debe revertir este pago..."
            helperText="Requerido. Será visible para Gerencia y Caja al revisar la solicitud."
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="warning"
          startIcon={loading ? <CircularProgress size={16} /> : <UndoIcon />}
          onClick={handleSubmit}
          disabled={loading || !reason.trim()}
        >
          Enviar Solicitud
        </Button>
      </DialogActions>
    </Dialog>
  );
};
