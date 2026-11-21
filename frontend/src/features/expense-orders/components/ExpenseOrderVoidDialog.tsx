import React from 'react';
import {
  Alert,
  Box,
  Button,
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
  useCreateExpenseOrderVoidRequest,
  useExpenseOrderVoidPreview,
} from '../../../hooks/useExpenseOrderVoidRequests';
import ExpenseOrderVoidPlanSummary from './ExpenseOrderVoidPlanSummary';

const MIN_REASON = 10;

const schema = z.object({
  moneyStayed: z.enum(['yes', 'no']).optional(),
  reason: z
    .string()
    .trim()
    .min(MIN_REASON, `Explica el motivo (mínimo ${MIN_REASON} caracteres)`)
    .max(500),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  expenseOrderId: string;
  onClose: () => void;
}

/** Pedir la anulación de una OG. La aprueba un administrador distinto. */
const ExpenseOrderVoidDialog: React.FC<Props> = ({ open, expenseOrderId, onClose }) => {
  const previewQuery = useExpenseOrderVoidPreview(open ? expenseOrderId : null);
  const createMutation = useCreateExpenseOrderVoidRequest();
  const plan = previewQuery.data;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { reason: '' } });

  React.useEffect(() => {
    if (open) reset({ reason: '' } as Partial<FormData>);
  }, [open, reset]);

  const moneyStayed = watch('moneyStayed');
  const needsMoneyAnswer = !!plan?.hasLiveMovements;
  const blocked = !!plan?.ineligibleReason || !!plan?.pendingRequestId;
  const canSubmit = !blocked && (!needsMoneyAnswer || moneyStayed === 'yes');

  const onSubmit = useSingleFlight(async (data: FormData) => {
    if (!canSubmit) return;
    await createMutation.mutateAsync({
      expenseOrderId,
      dto: {
        reason: data.reason.trim(),
        ...(needsMoneyAnswer && { cashStayedInDrawer: true }),
      },
    });
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Solicitar anulación de la OG</DialogTitle>
        <DialogContent>
          {previewQuery.isLoading || !plan ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              {previewQuery.isError ? (
                <Alert severity="error">No se pudo cargar la OG.</Alert>
              ) : (
                <CircularProgress size={28} />
              )}
            </Box>
          ) : (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Para una OG que no debía existir o que quedó con un valor mayor al real. Un administrador
                distinto de ti debe aprobarla. Si solo hay que corregir un dato, edita la OG en vez de
                anularla.
              </Typography>

              {plan.ineligibleReason && <Alert severity="error">{plan.ineligibleReason}</Alert>}
              {!plan.ineligibleReason && plan.pendingRequestId && (
                <Alert severity="info">Ya hay una solicitud de anulación pendiente para esta OG.</Alert>
              )}

              {!blocked && (
                <>
                  <ExpenseOrderVoidPlanSummary plan={plan} />
                  {plan.applyIssue && <Alert severity="info">{plan.applyIssue}</Alert>}

                  {needsMoneyAnswer && (
                    <Controller
                      name="moneyStayed"
                      control={control}
                      render={({ field }) => (
                        <FormControl error={!!errors.moneyStayed}>
                          <FormLabel sx={{ fontWeight: 600, color: 'text.primary' }}>
                            ¿El dinero sigue en la empresa? (el efectivo nunca salió del cajón o volvió, o la
                            transferencia no se hizo o el proveedor la devolvió)
                          </FormLabel>
                          <RadioGroup row {...field} value={field.value ?? ''}>
                            <FormControlLabel value="yes" control={<Radio />} label="Sí" />
                            <FormControlLabel value="no" control={<Radio />} label="No" />
                          </RadioGroup>
                          {errors.moneyStayed && <FormHelperText>{errors.moneyStayed.message}</FormHelperText>}
                        </FormControl>
                      )}
                    />
                  )}

                  {moneyStayed === 'no' && (
                    <Alert severity="error">
                      Entonces el proveedor tiene el dinero: anular la OG dejaría un faltante en caja. Primero hay que
                      recuperar el dinero. No se puede pedir la anulación.
                    </Alert>
                  )}

                  {moneyStayed !== 'no' && (
                    <Controller
                      name="reason"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Motivo"
                          placeholder="Ej.: el valor quedó mayor al real; se creará una OG nueva con el valor correcto"
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
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{blocked ? 'Cerrar' : 'Cancelar'}</Button>
          {!blocked && plan && (
            <LoadingButton
              type="submit"
              variant="contained"
              color="error"
              loading={createMutation.isPending}
              disabled={!canSubmit}
            >
              Solicitar anulación
            </LoadingButton>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ExpenseOrderVoidDialog;
