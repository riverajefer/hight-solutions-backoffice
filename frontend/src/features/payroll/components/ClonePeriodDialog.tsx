import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePayrollPeriods } from '../hooks/usePayrollPeriods';
import type {
  ClonePayrollPeriodResult,
  PayrollPeriod,
} from '../../../types/payroll-period.types';

// ─── Schema ──────────────────────────────────────────────────────────────────
const schema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido'),
    startDate: z.date({ invalid_type_error: 'Fecha inválida' }).nullable(),
    endDate: z.date({ invalid_type_error: 'Fecha inválida' }).nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.startDate) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Fecha de inicio requerida' });
    }
    if (!data.endDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Fecha de fin requerida' });
    }
    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'La fecha de fin debe ser posterior a la de inicio',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

// ─── Sugerencia del siguiente periodo ────────────────────────────────────────
// Quincenal: se corre la ventana 15 días. Mensual: mismo día del mes siguiente.
const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const suggestNextDates = (period: PayrollPeriod): { start: Date; end: Date } => {
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);
  return period.periodType === 'MONTHLY'
    ? { start: addMonths(start, 1), end: addMonths(end, 1) }
    : { start: addDays(start, 15), end: addDays(end, 15) };
};

interface Props {
  open: boolean;
  /** Periodo origen. `null` mientras el diálogo está cerrado. */
  period: PayrollPeriod | null;
  onClose: () => void;
  onCloned: (result: ClonePayrollPeriodResult) => void;
}

const ClonePeriodDialog: React.FC<Props> = ({ open, period, onClose, onCloned }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const { cloneMutation } = usePayrollPeriods();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', startDate: null, endDate: null },
  });

  // Al abrir, precarga una sugerencia del siguiente periodo (el usuario la ajusta).
  React.useEffect(() => {
    if (open && period) {
      setServerError(null);
      const { start, end } = suggestNextDates(period);
      reset({ name: `${period.name} (copia)`, startDate: start, endDate: end });
    }
  }, [open, period, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!period) return;
    setServerError(null);
    try {
      const result = await cloneMutation.mutateAsync({
        id: period.id,
        data: {
          name: values.name,
          startDate: values.startDate!.toISOString(),
          endDate: values.endDate!.toISOString(),
        },
      });
      onCloned(result);
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Error al clonar el periodo';
      setServerError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const isLoading = cloneMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Clonar Periodo de Nómina</DialogTitle>
      <DialogContent dividers>
        {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}

        {period && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Se creará un periodo nuevo a partir de <strong>{period.name}</strong>.
          </Typography>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          Se copiarán el <strong>salario base</strong>, los <strong>días trabajados</strong>, el{' '}
          <strong>auxilio de transporte</strong> y el <strong>descuento EPS/pensión</strong> de cada
          empleado activo, junto con las tarifas de horas extra del periodo. Las{' '}
          <strong>novedades</strong> (horas extras, comisiones, turnos extra, préstamos, anticipos y
          descuentos) quedarán en cero para que solo ajustes lo que cambió.
        </Alert>

        <form id="clone-payroll-period-form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Nombre del nuevo periodo *"
                    placeholder="Ej: 2 QUINCENA ENERO 2026"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Fecha de inicio *"
                    value={field.value ?? null}
                    onChange={field.onChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.startDate,
                        helperText: (errors.startDate as any)?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Fecha de fin *"
                    value={field.value ?? null}
                    onChange={field.onChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.endDate,
                        helperText: (errors.endDate as any)?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
        </form>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="text" color="inherit" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          type="submit"
          form="clone-payroll-period-form"
          disabled={isLoading}
        >
          {isLoading ? 'Clonando...' : 'Clonar Periodo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClonePeriodDialog;
