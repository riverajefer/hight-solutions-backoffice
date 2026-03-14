import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import type { ApplyDiscountDto } from '../../../types/order.types';

interface ApplyDiscountDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (discountDto: ApplyDiscountDto) => Promise<void>;
  maxAmount: number; // subtotal + tax (sin descuentos previos)
}

// Formatear moneda mientras se escribe (con separadores de miles)
const formatCurrencyInput = (value: string | number): string => {
  const numericValue = value.toString().replace(/\D/g, '');
  if (!numericValue) return '';
  const number = parseInt(numericValue, 10);
  return new Intl.NumberFormat('es-CO').format(number);
};

export const ApplyDiscountDialog: React.FC<ApplyDiscountDialogProps> = ({
  open,
  onClose,
  onApply,
  maxAmount,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setAmount('');
    setReason('');
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setAmount(formatted);
  };

  const handleSubmit = async () => {
    // Validar monto
    const numericAmount = parseFloat(amount.replace(/\./g, ''));
    if (!numericAmount || numericAmount <= 0) {
      enqueueSnackbar('El monto del descuento debe ser mayor a 0', {
        variant: 'error',
      });
      return;
    }

    if (numericAmount > maxAmount) {
      enqueueSnackbar(
        `El descuento no puede exceder ${new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
        }).format(maxAmount)}`,
        { variant: 'error' }
      );
      return;
    }

    // Validar razón
    if (!reason.trim()) {
      enqueueSnackbar('El motivo del descuento es obligatorio', {
        variant: 'error',
      });
      return;
    }

    if (reason.trim().length < 5) {
      enqueueSnackbar('El motivo debe tener al menos 5 caracteres', {
        variant: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      await onApply({
        amount: numericAmount,
        reason: reason.trim(),
      });
      enqueueSnackbar('Descuento aplicado exitosamente', {
        variant: 'success',
      });
      handleClose();
    } catch (error: any) {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al aplicar descuento',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Aplicar Descuento</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info">
            El descuento se aplicará al total de la orden. Debe proporcionar un
            motivo obligatorio para justificar el descuento.
          </Alert>

          <TextField
            label="Monto del descuento"
            value={amount}
            onChange={handleAmountChange}
            fullWidth
            required
            helperText={`Máximo: ${new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              minimumFractionDigits: 0,
            }).format(maxAmount)}`}
            placeholder="0"
          />

          <TextField
            label="Motivo del descuento"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            required
            multiline
            rows={3}
            placeholder="Ej: Compensación por insatisfacción del cliente"
            helperText="Mínimo 5 caracteres - Este motivo quedará registrado en el historial"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !amount || !reason.trim()}
        >
          {loading ? 'Aplicando...' : 'Aplicar Descuento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
