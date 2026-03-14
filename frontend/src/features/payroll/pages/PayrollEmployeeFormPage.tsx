import React, { useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
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
import { usePayrollEmployees } from '../hooks/usePayrollEmployees';
import { usersApi } from '../../../api/users.api';
import { cargosApi } from '../../../api/cargos.api';
import { useQuery } from '@tanstack/react-query';
import type { CreatePayrollEmployeeDto, UpdatePayrollEmployeeDto } from '../../../types';
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
    userId: z.string().min(1, 'Selecciona un usuario'),
    cargoId: z.string().optional(),
    employeeType: z.enum(['REGULAR', 'TEMPORARY']),
    monthlySalary: z.string().optional(),
    dailyRate: z.string().optional(),
    startDate: z.date({ invalid_type_error: 'Selecciona una fecha válida' }).nullable(),
    contractType: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.startDate) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'La fecha de ingreso es requerida' });
    }
    if (data.employeeType === 'REGULAR' && !data.monthlySalary) {
      ctx.addIssue({ code: 'custom', path: ['monthlySalary'], message: 'Requerido para empleados regulares' });
    }
    if (data.employeeType === 'TEMPORARY' && !data.dailyRate) {
      ctx.addIssue({ code: 'custom', path: ['dailyRate'], message: 'Requerido para empleados temporales' });
    }
  });

type FormValues = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────
const PayrollEmployeeFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { getEmployeeQuery, createMutation, updateMutation } = usePayrollEmployees();
  const employeeQuery = getEmployeeQuery(id ?? '');

  const usersQuery = useQuery({
    queryKey: ['users-for-payroll'],
    queryFn: () => usersApi.getAll(),
    enabled: !isEdit,
  });

  const cargosQuery = useQuery({
    queryKey: ['cargos-for-payroll'],
    queryFn: () => cargosApi.getAll(),
  });

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: '',
      cargoId: '',
      employeeType: 'REGULAR',
      monthlySalary: '',
      dailyRate: '',
      startDate: null,
      contractType: '',
      notes: '',
    },
  });

  const employeeType = watch('employeeType');

  useEffect(() => {
    if (isEdit && employeeQuery.data) {
      const e = employeeQuery.data;
      reset({
        userId: e.userId,
        cargoId: e.cargoId ?? '',
        employeeType: e.employeeType,
        monthlySalary: e.monthlySalary ? e.monthlySalary.toString().replace(/\D/g, '') : '',
        dailyRate: e.dailyRate ? e.dailyRate.toString().replace(/\D/g, '') : '',
        startDate: e.startDate ? new Date(e.startDate) : null,
        contractType: e.contractType ?? '',
        status: e.status,
        notes: e.notes ?? '',
      });
    }
  }, [isEdit, employeeQuery.data, reset]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const startDateStr = values.startDate ? values.startDate.toISOString() : '';
      if (isEdit && id) {
        const payload: UpdatePayrollEmployeeDto = {
          cargoId: values.cargoId || undefined,
          employeeType: values.employeeType,
          monthlySalary: values.monthlySalary ? Number(values.monthlySalary.replace(/\D/g, '')) : undefined,
          dailyRate: values.dailyRate ? Number(values.dailyRate.replace(/\D/g, '')) : undefined,
          startDate: startDateStr,
          contractType: (values.contractType as any) || undefined,
          status: values.status,
          notes: values.notes || undefined,
        };
        await updateMutation.mutateAsync({ id, data: payload });
        enqueueSnackbar('Empleado actualizado correctamente', { variant: 'success' });
      } else {
        const payload: CreatePayrollEmployeeDto = {
          userId: values.userId,
          cargoId: values.cargoId || undefined,
          employeeType: values.employeeType,
          monthlySalary: values.monthlySalary ? Number(values.monthlySalary.replace(/\D/g, '')) : undefined,
          dailyRate: values.dailyRate ? Number(values.dailyRate.replace(/\D/g, '')) : undefined,
          startDate: startDateStr,
          contractType: (values.contractType as any) || undefined,
          notes: values.notes || undefined,
        };
        await createMutation.mutateAsync(payload);
        enqueueSnackbar('Empleado agregado a nómina', { variant: 'success' });
      }
      navigate(PATHS.PAYROLL_EMPLOYEES);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Error al guardar';
      setServerError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && employeeQuery.isLoading) return <LoadingSpinner />;

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const cargos = cargosQuery.data ?? [];

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Empleado de Nómina' : 'Agregar Empleado a Nómina'}
        breadcrumbs={[
          { label: 'Nómina', path: PATHS.PAYROLL_EMPLOYEES },
          { label: isEdit ? 'Editar' : 'Agregar' },
        ]}
      />

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Usuario */}
            {!isEdit && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="userId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.userId}>
                      <InputLabel>Usuario del sistema *</InputLabel>
                      <Select {...field} label="Usuario del sistema *">
                        {(usersQuery.data ?? []).map((u: any) => (
                          <MenuItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.email ?? u.username})
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.userId && <FormHelperText>{errors.userId.message}</FormHelperText>}
                    </FormControl>
                  )}
                />
              </Grid>
            )}

            {/* Tipo de empleado */}
            <Grid item xs={12} md={6}>
              <Controller
                name="employeeType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Tipo de empleado</InputLabel>
                    <Select {...field} label="Tipo de empleado">
                      <MenuItem value="REGULAR">Regular (salario mensual)</MenuItem>
                      <MenuItem value="TEMPORARY">Temporal (tarifa diaria)</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Salario mensual — COP */}
            {employeeType === 'REGULAR' && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="monthlySalary"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      label="Salario mensual *"
                      error={!!errors.monthlySalary}
                      helperText={errors.monthlySalary?.message}
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
            )}

            {/* Tarifa diaria — COP */}
            {employeeType === 'TEMPORARY' && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="dailyRate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      label="Tarifa diaria *"
                      error={!!errors.dailyRate}
                      helperText={errors.dailyRate?.message}
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
            )}

            {/* Cargo laboral */}
            <Grid item xs={12} md={6}>
              <Controller
                name="cargoId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Cargo laboral</InputLabel>
                    <Select {...field} label="Cargo laboral">
                      <MenuItem value="">Sin asignar</MenuItem>
                      {cargos.map((c: any) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Fecha de ingreso — DatePicker */}
            <Grid item xs={12} md={6}>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Fecha de ingreso *"
                    value={field.value ?? null}
                    onChange={field.onChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.startDate,
                        helperText: errors.startDate?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Tipo de contrato */}
            <Grid item xs={12} md={6}>
              <Controller
                name="contractType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Tipo de contrato</InputLabel>
                    <Select {...field} label="Tipo de contrato">
                      <MenuItem value="">Sin especificar</MenuItem>
                      <MenuItem value="FIXED_TERM">Término fijo</MenuItem>
                      <MenuItem value="INDEFINITE">Término indefinido</MenuItem>
                      <MenuItem value="SERVICE_CONTRACT">Contrato de servicios</MenuItem>
                      <MenuItem value="INTERNSHIP">Práctica</MenuItem>
                    </Select>
                  </FormControl>
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
                        <MenuItem value="ACTIVE">Activo</MenuItem>
                        <MenuItem value="INACTIVE">Inactivo</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            )}

            {/* Notas */}
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Notas adicionales" multiline rows={3} />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button variant="contained" type="submit" disabled={isLoading} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  {isLoading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Agregar a Nómina'}
                </Button>
                <Button variant="outlined" onClick={() => navigate(PATHS.PAYROLL_EMPLOYEES)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
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

export default PayrollEmployeeFormPage;
