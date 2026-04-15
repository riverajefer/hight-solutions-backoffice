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
  Box,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CashMovement } from '../../../types/cash-register.types';

const schema = z.object({
  voidReason: z.string().min(1, 'El motivo es requerido').max(500),
});

type FormData = z.infer<typeof schema>;

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
  WITHDRAWAL: 'Retiro de Efectivo',
  DEPOSIT: 'Depósito a Caja',
};

const MOVEMENT_TYPE_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  INCOME: 'success',
  EXPENSE: 'error',
  WITHDRAWAL: 'warning',
  DEPOSIT: 'info',
};

interface Props {
  open: boolean;
  movement: CashMovement | null;
  onClose: () => void;
  onSubmit: (id: string, voidReason: string) => Promise<void>;
  isLoading?: boolean;
  isRequestMode?: boolean;
}

const VoidMovementDialog: React.FC<Props> = ({
  open,
  movement,
  onClose,
  onSubmit,
  isLoading,
  isRequestMode,
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

  React.useEffect(() => {
    if (open) {
      reset({ voidReason: '' });
    }
  }, [open, reset]);

  const handleFormSubmit = async (data: FormData) => {
    if (!movement) return;
    await onSubmit(movement.id, data.voidReason);
  };

  if (!movement) return null;

  const typeLabel = MOVEMENT_TYPE_LABELS[movement.movementType] || movement.movementType;
  const typeColor = MOVEMENT_TYPE_COLORS[movement.movementType] || 'default';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogTitle>{isRequestMode ? 'Solicitar Anulación de Movimiento' : 'Anular Movimiento'}</DialogTitle>

        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Movement summary */}
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Tipo
                  </Typography>
                  <Chip
                    label={typeLabel}
                    color={typeColor}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Recibo
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {movement.receiptNumber}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Monto
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color={`${typeColor}.main`}>
                    ${parseFloat(movement.amount).toLocaleString('es-CO')}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Descripción
                  </Typography>
                  <Typography variant="body2">
                    {movement.description}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Typography variant="body2" color="warning.main">
              {isRequestMode
                ? 'Se enviará una solicitud de anulación al administrador para su aprobación.'
                : 'Esta acción creará un movimiento de contrapartida para anular el efecto en caja. No se puede deshacer.'}
            </Typography>

            {/* Void reason */}
            <Controller
              name="voidReason"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Motivo de Anulación"
                  fullWidth
                  required
                  multiline
                  rows={3}
                  error={!!errors.voidReason}
                  helperText={errors.voidReason?.message}
                  placeholder="Describe el motivo por el cual se anula este movimiento..."
                />
              )}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color={isRequestMode ? 'warning' : 'error'}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
          >
            {isRequestMode ? 'Enviar Solicitud' : 'Confirmar Anulación'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default VoidMovementDialog;
