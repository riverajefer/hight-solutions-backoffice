import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { usePayrollEmployees } from '../hooks/usePayrollEmployees';
import { usersApi } from '../../../api/users.api';
import { cargosApi } from '../../../api/cargos.api';
import type { CreatePayrollEmployeeDto, PayrollEmployee } from '../../../types';

// ─── Currency helper ───────────────────────────────────────────────────────────
const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CO').format(parseInt(digits, 10));
};

// ─── Schema (solo creación) ──────────────────────────────────────────────────
const schema = z
  .object({
    userId: z.string().min(1, 'Selecciona un usuario'),
    cargoId: z.string().optional(),
    employeeType: z.enum(['REGULAR', 'TEMPORARY']),
    monthlySalary: z.string().optional(),
    dailyRate: z.string().optional(),
    startDate: z.date({ invalid_type_error: 'Selecciona una fecha válida' }).nullable(),
    contractType: z.string().optional(),
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

interface Props {
  open: boolean;
  onClose: () => void;
  /** Se invoca con el empleado recién creado para permitir auto-seleccionarlo. */
  onCreated: (employee: PayrollEmployee) => void;
  /** IDs de usuarios que ya son empleados de nómina (para excluirlos del selector). */
  existingUserIds?: string[];
}

const AddPayrollEmployeeDialog: React.FC<Props> = ({ open, onClose, onCreated, existingUserIds = [] }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const { createMutation } = usePayrollEmployees();

  const usersQuery = useQuery({
    queryKey: ['users-for-payroll'],
    queryFn: () => usersApi.getAll(),
    enabled: open,
  });
  const cargosQuery = useQuery({
    queryKey: ['cargos-for-payroll'],
    queryFn: () => cargosApi.getAll(),
    enabled: open,
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

  // Reinicia el formulario cada vez que se abre
  React.useEffect(() => {
    if (open) {
      setServerError(null);
      reset();
    }
  }, [open, reset]);

  const existing = new Set(existingUserIds);
  const availableUsers = (usersQuery.data ?? []).filter((u: any) => !existing.has(u.id));

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const payload: CreatePayrollEmployeeDto = {
        userId: values.userId,
        cargoId: values.cargoId || undefined,
        employeeType: values.employeeType,
        monthlySalary: values.monthlySalary ? Number(values.monthlySalary.replace(/\D/g, '')) : undefined,
        dailyRate: values.dailyRate ? Number(values.dailyRate.replace(/\D/g, '')) : undefined,
        startDate: values.startDate ? values.startDate.toISOString() : '',
        contractType: (values.contractType as any) || undefined,
        notes: values.notes || undefined,
      };
      const created = await createMutation.mutateAsync(payload);
      enqueueSnackbar('Empleado agregado a nómina', { variant: 'success' });
      onCreated(created);
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Error al guardar';
      setServerError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const cargos = cargosQuery.data ?? [];
  const isLoading = createMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Agregar Empleado a Nómina</DialogTitle>
      <DialogContent dividers>
        {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}

        <form id="add-payroll-employee-form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            {/* Usuario */}
            <Grid item xs={12} md={6}>
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.userId}>
                    <InputLabel>Usuario del sistema *</InputLabel>
                    <Select {...field} label="Usuario del sistema *">
                      {availableUsers.map((u: any) => (
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

            {/* Salario mensual */}
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

            {/* Tarifa diaria */}
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

            {/* Cargo */}
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

            {/* Fecha de ingreso */}
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

            {/* Notas */}
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Notas adicionales" multiline rows={2} />
                )}
              />
            </Grid>
          </Grid>
        </form>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button variant="contained" type="submit" form="add-payroll-employee-form" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Agregar a Nómina'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPayrollEmployeeDialog;
