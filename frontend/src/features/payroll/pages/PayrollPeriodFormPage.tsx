import React, { useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Alert,
  Paper,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { usePayrollPeriods } from '../hooks/usePayrollPeriods';
import type { CreatePayrollPeriodDto, UpdatePayrollPeriodDto } from '../../../types';
import { PATHS } from '../../../router/paths';

// ─── Currency helpers ────────────────────────────────────────────────────────
const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CO').format(parseInt(digits, 10));
};

// ─── Schema ──────────────────────────────────────────────────────────────────
const schema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido'),
    startDate: z.date({ invalid_type_error: 'Fecha inválida' }).nullable(),
    endDate: z.date({ invalid_type_error: 'Fecha inválida' }).nullable(),
    periodType: z.enum(['BIWEEKLY', 'MONTHLY']),
    status: z.enum(['DRAFT', 'CALCULATED', 'PAID']).optional(),
    overtimeDaytimeRate: z.string().optional(),
    overtimeNighttimeRate: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.startDate) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Fecha de inicio requerida' });
    }
    if (!data.endDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Fecha de fin requerida' });
    }
  });

type FormValues = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────
const PayrollPeriodFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { getPeriodQuery, createMutation, updateMutation } = usePayrollPeriods();
  const periodQuery = getPeriodQuery(id ?? '');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      startDate: null,
      endDate: null,
      periodType: 'BIWEEKLY',
      status: 'DRAFT',
      overtimeDaytimeRate: '9950',
      overtimeNighttimeRate: '13900',
      notes: '',
    },
  });

  useEffect(() => {
    if (isEdit && periodQuery.data) {
      const p = periodQuery.data;
      reset({
        name: p.name,
        startDate: p.startDate ? new Date(p.startDate) : null,
        endDate: p.endDate ? new Date(p.endDate) : null,
        periodType: p.periodType,
        status: p.status,
        overtimeDaytimeRate: p.overtimeDaytimeRate
          ? Math.round(Number(p.overtimeDaytimeRate)).toString()
          : '9950',
        overtimeNighttimeRate: p.overtimeNighttimeRate
          ? Math.round(Number(p.overtimeNighttimeRate)).toString()
          : '13900',
        notes: p.notes ?? '',
      });
    }
  }, [isEdit, periodQuery.data, reset]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const startDateStr = values.startDate ? values.startDate.toISOString() : '';
      const endDateStr = values.endDate ? values.endDate.toISOString() : '';
      const daytimeRate = values.overtimeDaytimeRate
        ? Number(values.overtimeDaytimeRate.replace(/\D/g, ''))
        : undefined;
      const nighttimeRate = values.overtimeNighttimeRate
        ? Number(values.overtimeNighttimeRate.replace(/\D/g, ''))
        : undefined;

      if (isEdit && id) {
        const payload: UpdatePayrollPeriodDto = {
          name: values.name,
          startDate: startDateStr,
          endDate: endDateStr,
          periodType: values.periodType,
          status: values.status,
          overtimeDaytimeRate: daytimeRate,
          overtimeNighttimeRate: nighttimeRate,
          notes: values.notes || undefined,
        };
        await updateMutation.mutateAsync({ id, data: payload });
        enqueueSnackbar('Periodo actualizado', { variant: 'success' });
      } else {
        const payload: CreatePayrollPeriodDto = {
          name: values.name,
          startDate: startDateStr,
          endDate: endDateStr,
          periodType: values.periodType,
          overtimeDaytimeRate: daytimeRate,
          overtimeNighttimeRate: nighttimeRate,
          notes: values.notes || undefined,
        };
        await createMutation.mutateAsync(payload);
        enqueueSnackbar('Periodo creado correctamente', { variant: 'success' });
      }
      navigate(PATHS.PAYROLL_PERIODS);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Error al guardar';
      setServerError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && periodQuery.isLoading) return <LoadingSpinner />;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Periodo de Nómina' : 'Crear Periodo de Nómina'}
        breadcrumbs={[
          { label: 'Periodos', path: PATHS.PAYROLL_PERIODS },
          { label: isEdit ? 'Editar' : 'Crear' },
        ]}
      />

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Nombre */}
            <Grid item xs={12} md={6}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Nombre del periodo *"
                    placeholder="Ej: 1 QUINCENA ENERO 2026"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>

            {/* Tipo */}
            <Grid item xs={12} md={6}>
              <Controller
                name="periodType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Tipo de periodo</InputLabel>
                    <Select {...field} label="Tipo de periodo">
                      <MenuItem value="BIWEEKLY">Quincenal</MenuItem>
                      <MenuItem value="MONTHLY">Mensual</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Fecha inicio — DatePicker */}
            <Grid item xs={12} md={6}>
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

            {/* Fecha fin — DatePicker */}
            <Grid item xs={12} md={6}>
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

            {/* Estado (solo edición) */}
            {isEdit && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Estado</InputLabel>
                      <Select {...field} label="Estado">
                        <MenuItem value="DRAFT">Borrador</MenuItem>
                        <MenuItem value="CALCULATED">Calculado</MenuItem>
                        <MenuItem value="PAID">Pagado</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            )}

            {/* Tarifa extra diurna — COP */}
            <Grid item xs={12} md={6}>
              <Controller
                name="overtimeDaytimeRate"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="Tarifa hora extra diurna"
                    helperText="Valor por hora extra diurna"
                    value={field.value ? formatCurrencyInput(field.value) : ''}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ color: 'text.secondary', fontWeight: 500 }}>$</Typography>
                        </InputAdornment>
                      ),
                      inputProps: { style: { textAlign: 'right' } },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Tarifa extra nocturna — COP */}
            <Grid item xs={12} md={6}>
              <Controller
                name="overtimeNighttimeRate"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="Tarifa hora extra nocturna"
                    helperText="Valor por hora extra nocturna"
                    value={field.value ? formatCurrencyInput(field.value) : ''}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ color: 'text.secondary', fontWeight: 500 }}>$</Typography>
                        </InputAdornment>
                      ),
                      inputProps: { style: { textAlign: 'right' } },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Notas */}
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Notas" multiline rows={3} />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button variant="contained" type="submit" disabled={isLoading} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  {isLoading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Periodo'}
                </Button>
                <Button variant="outlined" onClick={() => navigate(PATHS.PAYROLL_PERIODS)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  Cancelar
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default PayrollPeriodFormPage;
