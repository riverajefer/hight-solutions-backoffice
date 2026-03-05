import React, { useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Alert,
  Paper,
} from '@mui/material';
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

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  startDate: z.string().min(1, 'Fecha de inicio requerida'),
  endDate: z.string().min(1, 'Fecha de fin requerida'),
  periodType: z.enum(['BIWEEKLY', 'MONTHLY']),
  status: z.enum(['DRAFT', 'CALCULATED', 'PAID']).optional(),
  overtimeDaytimeRate: z.string().optional(),
  overtimeNighttimeRate: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

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
      startDate: '',
      endDate: '',
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
        startDate: p.startDate ? p.startDate.split('T')[0] : '',
        endDate: p.endDate ? p.endDate.split('T')[0] : '',
        periodType: p.periodType,
        status: p.status,
        overtimeDaytimeRate: p.overtimeDaytimeRate?.toString() ?? '9950',
        overtimeNighttimeRate: p.overtimeNighttimeRate?.toString() ?? '13900',
        notes: p.notes ?? '',
      });
    }
  }, [isEdit, periodQuery.data, reset]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      if (isEdit && id) {
        const payload: UpdatePayrollPeriodDto = {
          name: values.name,
          startDate: values.startDate,
          endDate: values.endDate,
          periodType: values.periodType,
          status: values.status,
          overtimeDaytimeRate: values.overtimeDaytimeRate ? Number(values.overtimeDaytimeRate) : undefined,
          overtimeNighttimeRate: values.overtimeNighttimeRate ? Number(values.overtimeNighttimeRate) : undefined,
          notes: values.notes || undefined,
        };
        await updateMutation.mutateAsync({ id, data: payload });
        enqueueSnackbar('Periodo actualizado', { variant: 'success' });
      } else {
        const payload: CreatePayrollPeriodDto = {
          name: values.name,
          startDate: values.startDate,
          endDate: values.endDate,
          periodType: values.periodType,
          overtimeDaytimeRate: values.overtimeDaytimeRate ? Number(values.overtimeDaytimeRate) : undefined,
          overtimeNighttimeRate: values.overtimeNighttimeRate ? Number(values.overtimeNighttimeRate) : undefined,
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

      <Paper sx={{ p: 3 }}>
        {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
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

            <Grid item xs={12} md={6}>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Fecha de inicio *"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.startDate}
                    helperText={errors.startDate?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Fecha de fin *"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.endDate}
                    helperText={errors.endDate?.message}
                  />
                )}
              />
            </Grid>

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

            <Grid item xs={12} md={6}>
              <Controller
                name="overtimeDaytimeRate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Tarifa hora extra diurna (COP)"
                    type="number"
                    helperText="Valor por hora extra diurna"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="overtimeNighttimeRate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Tarifa hora extra nocturna (COP)"
                    type="number"
                    helperText="Valor por hora extra nocturna"
                  />
                )}
              />
            </Grid>

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
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" type="submit" disabled={isLoading}>
                  {isLoading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Periodo'}
                </Button>
                <Button variant="outlined" onClick={() => navigate(PATHS.PAYROLL_PERIODS)}>
                  Cancelar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default PayrollPeriodFormPage;
