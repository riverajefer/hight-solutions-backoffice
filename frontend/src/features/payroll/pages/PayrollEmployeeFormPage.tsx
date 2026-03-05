import React, { useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
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
import { usePayrollEmployees } from '../hooks/usePayrollEmployees';
import { usersApi } from '../../../api/users.api';
import { useQuery } from '@tanstack/react-query';
import type { CreatePayrollEmployeeDto, UpdatePayrollEmployeeDto } from '../../../types';
import { PATHS } from '../../../router/paths';

const schema = z
  .object({
    userId: z.string().min(1, 'Selecciona un usuario'),
    employeeType: z.enum(['REGULAR', 'TEMPORARY']),
    monthlySalary: z.string().optional(),
    dailyRate: z.string().optional(),
    jobTitle: z.string().optional(),
    startDate: z.string().min(1, 'La fecha de ingreso es requerida'),
    contractType: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.employeeType === 'REGULAR' && !data.monthlySalary) {
      ctx.addIssue({ code: 'custom', path: ['monthlySalary'], message: 'Requerido para empleados regulares' });
    }
    if (data.employeeType === 'TEMPORARY' && !data.dailyRate) {
      ctx.addIssue({ code: 'custom', path: ['dailyRate'], message: 'Requerido para empleados temporales' });
    }
  });

type FormValues = z.infer<typeof schema>;

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

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: '',
      employeeType: 'REGULAR',
      monthlySalary: '',
      dailyRate: '',
      jobTitle: '',
      startDate: '',
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
        employeeType: e.employeeType,
        monthlySalary: e.monthlySalary?.toString() ?? '',
        dailyRate: e.dailyRate?.toString() ?? '',
        jobTitle: e.jobTitle ?? '',
        startDate: e.startDate ? e.startDate.split('T')[0] : '',
        contractType: e.contractType ?? '',
        status: e.status,
        notes: e.notes ?? '',
      });
    }
  }, [isEdit, employeeQuery.data, reset]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      if (isEdit && id) {
        const payload: UpdatePayrollEmployeeDto = {
          employeeType: values.employeeType,
          monthlySalary: values.monthlySalary ? Number(values.monthlySalary) : undefined,
          dailyRate: values.dailyRate ? Number(values.dailyRate) : undefined,
          jobTitle: values.jobTitle || undefined,
          startDate: values.startDate,
          contractType: (values.contractType as any) || undefined,
          status: values.status,
          notes: values.notes || undefined,
        };
        await updateMutation.mutateAsync({ id, data: payload });
        enqueueSnackbar('Empleado actualizado correctamente', { variant: 'success' });
      } else {
        const payload: CreatePayrollEmployeeDto = {
          userId: values.userId,
          employeeType: values.employeeType,
          monthlySalary: values.monthlySalary ? Number(values.monthlySalary) : undefined,
          dailyRate: values.dailyRate ? Number(values.dailyRate) : undefined,
          jobTitle: values.jobTitle || undefined,
          startDate: values.startDate,
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

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Empleado de Nómina' : 'Agregar Empleado a Nómina'}
        breadcrumbs={[
          { label: 'Nómina', path: PATHS.PAYROLL_EMPLOYEES },
          { label: isEdit ? 'Editar' : 'Agregar' },
        ]}
      />

      <Paper sx={{ p: 3 }}>
        {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
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

            {employeeType === 'REGULAR' && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="monthlySalary"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Salario mensual (COP) *"
                      type="number"
                      error={!!errors.monthlySalary}
                      helperText={errors.monthlySalary?.message}
                    />
                  )}
                />
              </Grid>
            )}

            {employeeType === 'TEMPORARY' && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="dailyRate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Tarifa diaria (COP) *"
                      type="number"
                      error={!!errors.dailyRate}
                      helperText={errors.dailyRate?.message}
                    />
                  )}
                />
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <Controller
                name="jobTitle"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Cargo o rol laboral" />
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
                    label="Fecha de ingreso *"
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
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" type="submit" disabled={isLoading}>
                  {isLoading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Agregar a Nómina'}
                </Button>
                <Button variant="outlined" onClick={() => navigate(PATHS.PAYROLL_EMPLOYEES)}>
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

export default PayrollEmployeeFormPage;
