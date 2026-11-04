import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import {
  useCashTransferPreview,
  useCreateCashTransferRequest,
} from '../../../hooks/useCashTransferRequests';
import { formatCurrency } from '../../../utils/formatters';
import type { CashTransferPreview } from '../../../types/cash-transfer-request.types';
import { formatDateTime, formatSigned, isIncomeMovement } from '../utils/cashTransfer';

const MIN_REASON = 10;

const schema = z.object({
  cashStayed: z.enum(['yes', 'no'], { required_error: 'Responde la pregunta' }),
  reason: z
    .string()
    .trim()
    .min(MIN_REASON, `Explica el motivo (mínimo ${MIN_REASON} caracteres)`)
    .max(500),
});

type FormData = z.infer<typeof schema>;

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
  WITHDRAWAL: 'Retiro',
  DEPOSIT: 'Depósito',
};

/** Antes y después del cierre de origen. Se usa al pedir y al aprobar. */
export const TransferEffectSummary: React.FC<{ preview: CashTransferPreview }> = ({ preview }) => {
  const { effect } = preview;
  if (!effect) return null;
  const targetChange = Number(effect.targetExpectedChange);

  return (
    <Stack spacing={1.5}>
      <Box sx={{ p: 2, borderRadius: 1, border: 1, borderColor: effect.worsens ? 'warning.main' : 'divider' }}>
        <Typography variant="subtitle2" gutterBottom>
          Cierre del {formatDateTime(preview.sourceSession.closedAt)}
        </Typography>
        <Stack spacing={0.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">Esperado</Typography>
            <Typography variant="body2">
              {formatCurrency(effect.systemBalanceBefore)} → <strong>{formatCurrency(effect.systemBalanceAfter)}</strong>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">Diferencia</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">
                {formatSigned(effect.discrepancyBefore)} →{' '}
                <strong>{formatSigned(effect.discrepancyAfter)}</strong>
              </Typography>
              {effect.worsens && <Chip label="Empeora" color="warning" size="small" />}
            </Box>
          </Box>
        </Stack>
      </Box>
      <Typography variant="body2" color="text.secondary">
        La caja de hoy esperará{' '}
        <strong>
          {formatCurrency(Math.abs(targetChange))} {targetChange < 0 ? 'menos' : 'más'}
        </strong>{' '}
        en efectivo.
      </Typography>
      {effect.worsens && (
        <Alert severity="warning">
          Con este traslado el descuadre de ese día crece. Si el dinero sí salió de la caja ese día,
          trasladarlo permite volver a sacarlo hoy.
        </Alert>
      )}
      {preview.crossesMonth && (
        <Alert severity="warning">
          Este traslado cambia el arqueo de <strong>{preview.sourceMonthLabel}</strong>. Avísale a
          contabilidad.
        </Alert>
      )}
    </Stack>
  );
};

interface Props {
  open: boolean;
  movementId: string | null;
  onClose: () => void;
}

const TransferMovementDialog: React.FC<Props> = ({ open, movementId, onClose }) => {
  const previewQuery = useCashTransferPreview(open ? movementId : null);
  const createMutation = useCreateCashTransferRequest();
  const preview = previewQuery.data;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });

  React.useEffect(() => {
    if (open) reset({ reason: '' } as Partial<FormData>);
  }, [open, reset]);

  const cashStayed = watch('cashStayed');

  const onSubmit = useSingleFlight(async (data: FormData) => {
    if (!movementId || data.cashStayed !== 'yes') return;
    await createMutation.mutateAsync({
      movementId,
      dto: { reason: data.reason.trim(), cashStayedInDrawer: true },
    });
    onClose();
  });

  const income = preview ? isIncomeMovement(preview.movement.movementType) : false;
  const blocked = !!preview?.ineligibleReason || !!preview?.pendingRequestId;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Trasladar a la caja de hoy</DialogTitle>
        <DialogContent>
          {previewQuery.isLoading || !preview ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              {previewQuery.isError ? (
                <Alert severity="error">No se pudo cargar el movimiento.</Alert>
              ) : (
                <CircularProgress size={28} />
              )}
            </Box>
          ) : (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {income
                  ? 'Para un ingreso que quedó en un cierre aunque el dinero llegó a la caja en la sesión siguiente.'
                  : 'Para un pago que Caja registró, pero el dinero no se entregó ese día y se va a entregar hoy.'}{' '}
                El movimiento pasa a la caja de hoy y se corrige el cierre de ese día. No se anula ni se
                duplica nada.
              </Typography>

              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Stack spacing={0.75}>
                  <Row label="Recibo" value={preview.movement.receiptNumber} />
                  <Row
                    label="Movimiento"
                    value={`${MOVEMENT_TYPE_LABELS[preview.movement.movementType] ?? preview.movement.movementType} de ${formatCurrency(preview.movement.amount)}`}
                  />
                  {preview.movement.expenseOrder && (
                    <Row label="Orden de gasto" value={preview.movement.expenseOrder.ogNumber} />
                  )}
                  <Row label="Registrado" value={formatDateTime(preview.movement.createdAt)} />
                  <Row label="Caja" value={preview.sourceSession.cashRegisterName} />
                </Stack>
              </Box>

              {preview.ineligibleReason && <Alert severity="error">{preview.ineligibleReason}</Alert>}
              {!preview.ineligibleReason && preview.pendingRequestId && (
                <Alert severity="info">Ya hay una solicitud de traslado pendiente para este movimiento.</Alert>
              )}

              {!blocked && (
                <>
                  <TransferEffectSummary preview={preview} />
                  {preview.targetIssue && <Alert severity="info">{preview.targetIssue}</Alert>}

                  <Controller
                    name="cashStayed"
                    control={control}
                    render={({ field }) => (
                      <FormControl error={!!errors.cashStayed}>
                        <FormLabel sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {income
                            ? '¿El dinero llegó a la caja en la sesión siguiente?'
                            : '¿El dinero se quedó en la caja ese día?'}
                        </FormLabel>
                        <RadioGroup row {...field} value={field.value ?? ''}>
                          <FormControlLabel value="yes" control={<Radio />} label="Sí" />
                          <FormControlLabel value="no" control={<Radio />} label="No" />
                        </RadioGroup>
                        {errors.cashStayed && <FormHelperText>{errors.cashStayed.message}</FormHelperText>}
                      </FormControl>
                    )}
                  />

                  {cashStayed === 'no' && (
                    <Alert severity="error">
                      Entonces no es un traslado: es un faltante de ese día y hay que investigarlo
                      (¿a quién se le entregó el dinero?). No se puede pedir el traslado.
                    </Alert>
                  )}

                  {cashStayed !== 'no' && (
                    <Controller
                      name="reason"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Motivo"
                          placeholder={
                            income
                              ? 'Ej.: el abono se registró durante el arqueo y el billete quedó para la sesión siguiente'
                              : 'Ej.: el proveedor nunca recibió el pago; se le entrega hoy'
                          }
                          multiline
                          minRows={2}
                          fullWidth
                          required
                          error={!!errors.reason}
                          helperText={errors.reason?.message}
                        />
                      )}
                    />
                  )}

                  {!income && cashStayed === 'yes' && (
                    <Alert severity="info">
                      Recomendado: cuando entregues el dinero, sube el comprobante del pago en la orden de gasto.
                    </Alert>
                  )}
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{blocked ? 'Cerrar' : 'Cancelar'}</Button>
          {!blocked && preview && (
            <LoadingButton
              type="submit"
              variant="contained"
              loading={createMutation.isPending}
              disabled={cashStayed !== 'yes'}
            >
              Solicitar traslado
            </LoadingButton>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value}</Typography>
  </Box>
);

export default TransferMovementDialog;
