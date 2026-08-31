import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Divider,
  CircularProgress,
  Chip,
  Alert,
  Box,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Payment } from '../../../types/order.types';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';

const schema = z.object({
  // El backend exige lo mismo: el motivo es lo único que le explica a quien lea
  // el historial (o el arqueo) por qué desapareció ese dinero.
  voidReason: z
    .string()
    .min(10, 'Explica el motivo de la anulación (mínimo 10 caracteres)')
    .max(500, 'Máximo 500 caracteres'),
});

type FormData = z.infer<typeof schema>;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CREDIT: 'Crédito',
  CREDIT_BALANCE: 'Saldo a favor',
};

interface Props {
  open: boolean;
  payment: Payment | null;
  onClose: () => void;
  onSubmit: (paymentId: string, voidReason: string) => Promise<void>;
  isLoading?: boolean;
}

const VoidPaymentDialog: React.FC<Props> = ({
  open,
  payment,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { voidReason: '' },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (data: FormData) => {
    if (!payment) return;
    await onSubmit(payment.id, data.voidReason);
    reset();
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Anular pago</DialogTitle>
      <form onSubmit={handleSubmit(submit)}>
        <DialogContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant='body2' color='text.secondary'>
                Vas a anular este pago:
              </Typography>
              <Stack
                direction='row'
                spacing={1}
                alignItems='center'
                sx={{ mt: 1 }}
              >
                <Typography variant='h6'>
                  {formatCurrency(payment.amount)}
                </Typography>
                <Chip
                  label={
                    PAYMENT_METHOD_LABELS[payment.paymentMethod] ||
                    payment.paymentMethod
                  }
                  size='small'
                />
              </Stack>
              <Typography variant='caption' color='text.secondary'>
                Registrado el {formatDateTime(payment.paymentDate)} por{' '}
                {payment.receivedBy.firstName} {payment.receivedBy.lastName}
              </Typography>
            </Box>

            <Divider />

            {/* El desenlace depende de si la caja de ESE pago sigue abierta, cosa
                que el usuario no tiene cómo saber desde acá. Se le avisa que
                puede terminar en solicitud en vez de sorprenderlo después. */}
            <Alert severity='info'>
              El pago no se borra: queda marcado como anulado, con tu motivo y tu
              nombre, y deja de sumar al saldo de la orden. Si la caja de este
              pago ya está cerrada, la anulación quedará pendiente de
              autorización del administrador.
            </Alert>

            <Controller
              name='voidReason'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label='Motivo de la anulación'
                  placeholder='Ej: Pago duplicado, el mismo soporte ya se registró a las 14:35'
                  multiline
                  rows={3}
                  fullWidth
                  required
                  autoFocus
                  error={!!errors.voidReason}
                  helperText={
                    errors.voidReason?.message ||
                    'Queda visible en el Historial de Pagos y en el arqueo de caja'
                  }
                  disabled={isLoading}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type='submit'
            variant='contained'
            color='error'
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Anular pago'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default VoidPaymentDialog;
