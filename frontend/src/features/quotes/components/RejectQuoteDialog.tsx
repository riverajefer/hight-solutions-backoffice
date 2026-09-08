import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

const MAX_REASON_LENGTH = 500;

interface RejectQuoteDialogProps {
  open: boolean;
  quoteNumber?: string;
  onClose: () => void;
  onConfirm: (rejectionReason: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Captura el motivo obligatorio al rechazar una cotización.
 * El backend rechaza la transición a REJECTED si el motivo llega vacío.
 */
export const RejectQuoteDialog: React.FC<RejectQuoteDialogProps> = ({
  open,
  quoteNumber,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  const isEmpty = !reason.trim();

  const handleConfirm = async () => {
    setTouched(true);
    if (isEmpty) return;
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch {
      // El error se notifica desde la mutación
    }
  };

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rechazar Cotización</DialogTitle>
      <DialogContent>
        {quoteNumber && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cotización: <strong>{quoteNumber}</strong>
          </Typography>
        )}

        <Alert severity="warning" sx={{ mb: 2 }}>
          «Rechazada» es un estado final: la cotización no podrá avanzar a otro estado.
        </Alert>

        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label="Motivo del rechazo"
          placeholder="Ej: El cliente eligió otro proveedor por precio"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
          onBlur={() => setTouched(true)}
          disabled={isLoading}
          error={touched && isEmpty}
          helperText={
            touched && isEmpty
              ? 'El motivo es obligatorio'
              : `${reason.length}/${MAX_REASON_LENGTH}`
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={isEmpty || isLoading}
        >
          {isLoading ? 'Rechazando...' : 'Rechazar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
