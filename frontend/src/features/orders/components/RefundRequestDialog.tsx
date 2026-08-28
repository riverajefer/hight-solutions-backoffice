import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  MenuItem,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useCreateRefundRequest } from '../hooks/useRefundRequests';
import type { RefundPaymentMethod } from '../../../types/refund-request.types';
import { BankSelector } from '../../../components/common/BankSelector';

interface RefundRequestDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  maxAmount: number; // overpayment = paidAmount - total
}

const formatCurrencyInput = (value: string | number): string => {
  const numericValue = value.toString().replace(/\D/g, '');
  if (!numericValue) return '';
  const number = parseInt(numericValue, 10);
  return new Intl.NumberFormat('es-CO').format(number);
};

const formatCOP = (n: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);

const PAYMENT_METHOD_OPTIONS: { value: RefundPaymentMethod; label: string }[] =
  [
    { value: 'CASH', label: 'Efectivo' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'CARD', label: 'Tarjeta' },
  ];

export const RefundRequestDialog: React.FC<RefundRequestDialogProps> = ({
  open,
  onClose,
  orderId,
  orderNumber,
  maxAmount,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const createMutation = useCreateRefundRequest();

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] =
    useState<RefundPaymentMethod>('CASH');
  const [bankEntity, setBankEntity] = useState<string | null>(null);
  const [observation, setObservation] = useState<string>('');
  const submitting = useRef(false);

  const loading = createMutation.isPending;

  const resetAndClose = () => {
    setAmount('');
    setPaymentMethod('CASH');
    setBankEntity(null);
    setObservation('');
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatCurrencyInput(e.target.value));
  };

  const handleSubmit = async () => {
    // El botón se deshabilita hasta el siguiente render, así que dos clics en el
    // mismo frame llegarían los dos hasta el `mutateAsync`.
    if (submitting.current) return;

    const numericAmount = parseFloat(amount.replace(/\./g, ''));
    if (!numericAmount || numericAmount <= 0) {
      enqueueSnackbar('El monto a devolver debe ser mayor a 0', {
        variant: 'error',
      });
      return;
    }
    if (numericAmount > maxAmount) {
      enqueueSnackbar(
        `El monto a devolver no puede exceder ${formatCOP(maxAmount)}`,
        { variant: 'error' },
      );
      return;
    }
    if (!observation.trim() || observation.trim().length < 5) {
      enqueueSnackbar('La observación es obligatoria (mínimo 5 caracteres)', {
        variant: 'error',
      });
      return;
    }

    submitting.current = true;
    try {
      await createMutation.mutateAsync({
        orderId,
        refundAmount: numericAmount,
        paymentMethod,
        bankEntity: paymentMethod === 'TRANSFER' ? bankEntity ?? null : null,
        observation: observation.trim(),
      });
      resetAndClose();
    } catch {
      // handled by hook
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Dialog open={open} onClose={resetAndClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar devolución — Orden {orderNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info">
            Esta solicitud requiere aprobación. El dinero se descontará de la
            caja <strong>solo cuando sea aprobada</strong>.
          </Alert>

          <Alert severity="success">
            Saldo a favor disponible: <strong>{formatCOP(maxAmount)}</strong>
          </Alert>

          <TextField
            label="Monto a devolver (COP)"
            value={amount}
            onChange={handleAmountChange}
            fullWidth
            required
            placeholder="0"
            helperText={`Máximo: ${formatCOP(maxAmount)}`}
          />

          <TextField
            select
            label="Método de pago de la devolución"
            value={paymentMethod}
            onChange={(e) => {
              const method = e.target.value as RefundPaymentMethod;
              setPaymentMethod(method);
              if (method !== 'TRANSFER') setBankEntity(null);
            }}
            fullWidth
            required
          >
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          {paymentMethod === 'TRANSFER' && (
            <BankSelector value={bankEntity} onChange={setBankEntity} />
          )}

          <TextField
            label="Observación / Motivo"
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            fullWidth
            required
            multiline
            rows={3}
            placeholder="Ej: Cliente pagó de más al liquidar la orden"
            helperText="Mínimo 5 caracteres — quedará registrado en el historial"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={resetAndClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="warning"
          disabled={loading || !amount || !observation.trim()}
        >
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
