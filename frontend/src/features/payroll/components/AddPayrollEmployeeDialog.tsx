import React from 'react';
import {
  Alert,
  Box,
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
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
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

// ─── Opciones de selects ─────────────────────────────────────────────────────
const identificationTypeOptions: { value: string; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'PPT', label: 'PPT (Permiso por Protección Temporal)' },
  { value: 'NIT', label: 'NIT' },
];

const sexOptions: { value: string; label: string }[] = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'OTHER', label: 'Otro' },
];

// ─── Schema (solo creación) ──────────────────────────────────────────────────
const schema = z
  .object({
    // Laboral
    userId: z.string().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    cargoId: z.string().optional(),
    employeeType: z.enum(['REGULAR', 'TEMPORARY']),
    monthlySalary: z.string().optional(),
    dailyRate: z.string().optional(),
    startDate: z.date({ invalid_type_error: 'Selecciona una fecha válida' }).nullable(),
    contractEndDate: z.date({ invalid_type_error: 'Selecciona una fecha válida' }).nullable().optional(),
    contractType: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    notes: z.string().optional(),
    // Identificación
    identificationType: z.string().optional(),
    identificationNumber: z.string().optional(),
    documentIssueDate: z.date({ invalid_type_error: 'Selecciona una fecha válida' }).nullable().optional(),
    // Nombres
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    firstLastName: z.string().optional(),
    secondLastName: z.string().optional(),
    // Personales
    sex: z.string().optional(),
    birthDate: z.date({ invalid_type_error: 'Selecciona una fecha válida' }).nullable().optional(),
    // Contacto
    address: z.string().optional(),
    neighborhood: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    // Seguridad social
    eps: z.string().optional(),
    pensionFund: z.string().optional(),
    // Emergencia
    emergencyContactName: z.string().optional(),
    emergencyContactRelationship: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Si no se vincula un usuario existente, se crea uno nuevo (nombre/apellido/contraseña).
    if (!data.userId) {
      if (!data.firstName) {
        ctx.addIssue({ code: 'custom', path: ['firstName'], message: 'Requerido para crear el usuario' });
      }
      if (!data.firstLastName) {
        ctx.addIssue({ code: 'custom', path: ['firstLastName'], message: 'Requerido para crear el usuario' });
      }
      if (!data.password || data.password.length < 6) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'Mínimo 6 caracteres' });
      }
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Las contraseñas no coinciden' });
      }
    }
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

// Última pestaña (Laboral): allí se muestra el botón de guardar.
const LAST_TAB = 2;

// Estilo "segmented stepper" para que las pestañas se vean como pasos destacados.
const STEP_TABS_SX = {
  mb: 3,
  minHeight: 48,
  p: 0.5,
  borderRadius: 2,
  bgcolor: 'action.hover',
  '& .MuiTabs-indicator': { display: 'none' },
  '& .MuiTab-root': {
    minHeight: 40,
    borderRadius: 1.5,
    textTransform: 'none',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'text.secondary',
    transition: 'background-color .2s, color .2s',
  },
  '& .MuiTab-root:hover': { color: 'text.primary' },
  '& .MuiTab-root.Mui-selected': {
    color: '#FFFFFF',
    fontWeight: 700,
    bgcolor: 'primary.dark',
    boxShadow: 2,
  },
} as const;

// Pestaña que contiene cada campo, para saltar a la que tenga error.
const FIELD_TAB: Partial<Record<keyof FormValues, number>> = {
  identificationType: 0, identificationNumber: 0, documentIssueDate: 0,
  firstName: 0, middleName: 0, firstLastName: 0, secondLastName: 0, sex: 0, birthDate: 0,
  address: 1, neighborhood: 1, phone: 1, email: 1, eps: 1, pensionFund: 1,
  emergencyContactName: 1, emergencyContactRelationship: 1, emergencyContactPhone: 1,
  employeeType: 2, monthlySalary: 2, dailyRate: 2, cargoId: 2,
  startDate: 2, contractEndDate: 2, contractType: 2, status: 2, notes: 2,
};

const emptyDefaults: FormValues = {
  userId: '', password: '', confirmPassword: '', cargoId: '', employeeType: 'REGULAR', monthlySalary: '', dailyRate: '',
  startDate: null, contractEndDate: null, contractType: '', status: 'ACTIVE', notes: '',
  identificationType: '', identificationNumber: '', documentIssueDate: null,
  firstName: '', middleName: '', firstLastName: '', secondLastName: '', sex: '', birthDate: null,
  address: '', neighborhood: '', phone: '', email: '', eps: '', pensionFund: '',
  emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '',
};

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
  const [tab, setTab] = React.useState(0);
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

  const { control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults,
  });

  const employeeType = watch('employeeType');
  const selectedUserId = watch('userId');
  const willCreateUser = !selectedUserId;

  // Al seleccionar un usuario del sistema, precarga sus datos personales en el formulario.
  const prefillFromUser = (userId: string) => {
    const user = (usersQuery.data ?? []).find((u: any) => u.id === userId);
    if (!user) return;
    setValue('firstName', user.firstName ?? '');
    setValue('firstLastName', user.lastName ?? '');
    setValue('email', user.email ?? '');
    setValue('phone', user.phone ?? '');
    if (user.cargoId) setValue('cargoId', user.cargoId);
  };

  // Reinicia el formulario cada vez que se abre
  React.useEffect(() => {
    if (open) {
      setServerError(null);
      setTab(0);
      reset(emptyDefaults);
    }
  }, [open, reset]);

  const existing = new Set(existingUserIds);
  const availableUsers = (usersQuery.data ?? []).filter((u: any) => !existing.has(u.id));

  const onInvalid = (formErrors: typeof errors) => {
    const target = Object.keys(formErrors)
      .map((k) => FIELD_TAB[k as keyof FormValues])
      .find((t) => t !== undefined);
    if (target !== undefined) setTab(target);
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const payload: CreatePayrollEmployeeDto = {
        userId: values.userId || undefined,
        password: values.userId ? undefined : values.password || undefined,
        cargoId: values.cargoId || undefined,
        employeeType: values.employeeType,
        monthlySalary: values.monthlySalary ? Number(values.monthlySalary.replace(/\D/g, '')) : undefined,
        dailyRate: values.dailyRate ? Number(values.dailyRate.replace(/\D/g, '')) : undefined,
        startDate: values.startDate ? values.startDate.toISOString() : '',
        contractEndDate: values.contractEndDate ? values.contractEndDate.toISOString() : null,
        contractType: (values.contractType as any) || undefined,
        status: values.status,
        notes: values.notes || undefined,
        // Datos personales
        identificationType: (values.identificationType || null) as any,
        identificationNumber: values.identificationNumber || null,
        documentIssueDate: values.documentIssueDate ? values.documentIssueDate.toISOString() : null,
        firstName: values.firstName || null,
        middleName: values.middleName || null,
        firstLastName: values.firstLastName || null,
        secondLastName: values.secondLastName || null,
        sex: (values.sex || null) as any,
        birthDate: values.birthDate ? values.birthDate.toISOString() : null,
        address: values.address || null,
        neighborhood: values.neighborhood || null,
        phone: values.phone || null,
        email: values.email || null,
        eps: values.eps || null,
        pensionFund: values.pensionFund || null,
        emergencyContactName: values.emergencyContactName || null,
        emergencyContactRelationship: values.emergencyContactRelationship || null,
        emergencyContactPhone: values.emergencyContactPhone || null,
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

  // Helper: campo de texto simple controlado.
  const textField = (name: keyof FormValues, label: string, extra?: Record<string, unknown>) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          value={(field.value as string) ?? ''}
          fullWidth
          label={label}
          error={!!errors[name]}
          helperText={(errors[name] as any)?.message}
          {...extra}
        />
      )}
    />
  );

  // Helper: selector de fecha controlado.
  const dateField = (name: keyof FormValues, label: string) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <DatePicker
          label={label}
          value={(field.value as Date | null) ?? null}
          onChange={field.onChange}
          slotProps={{
            textField: {
              fullWidth: true,
              error: !!errors[name],
              helperText: (errors[name] as any)?.message,
            },
            field: { clearable: true },
          }}
        />
      )}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Agregar Empleado a Nómina</DialogTitle>
      <DialogContent dividers>
        {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}

        {/* Usuario del sistema — se selecciona primero y precarga sus datos */}
        <Grid container spacing={3} sx={{ mb: 1 }}>
          <Grid item xs={12} md={6}>
            <Controller
              name="userId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.userId}>
                  <InputLabel>Usuario del sistema</InputLabel>
                  <Select
                    {...field}
                    label="Usuario del sistema"
                    onChange={(e) => {
                      field.onChange(e);
                      prefillFromUser(e.target.value as string);
                    }}
                  >
                    <MenuItem value="">➕ Crear nuevo usuario del sistema</MenuItem>
                    {availableUsers.map((u: any) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.email ?? u.username})
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.userId ? (
                    <FormHelperText>{errors.userId.message}</FormHelperText>
                  ) : (
                    <FormHelperText>
                      Selecciona un usuario existente (precarga sus datos) o crea uno nuevo.
                    </FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>

          {willCreateUser && (
            <>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 0 }}>
                  Este empleado también será <strong>usuario del sistema</strong> con rol{' '}
                  <strong>Usuario</strong>. Ingresa una contraseña; el nombre, correo y teléfono se
                  toman de las pestañas <strong>Datos personales</strong> y <strong>Contacto</strong>.
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="password"
                      fullWidth
                      label="Contraseña *"
                      autoComplete="new-password"
                      error={!!errors.password}
                      helperText={errors.password?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="password"
                      fullWidth
                      label="Confirmar contraseña *"
                      autoComplete="new-password"
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Rol"
                  value="Usuario"
                  disabled
                  helperText="Los empleados se crean con rol Usuario."
                />
              </Grid>
            </>
          )}
        </Grid>

        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="fullWidth"
          sx={STEP_TABS_SX}
        >
          <Tab label="1. Datos personales" />
          <Tab label="2. Contacto" />
          <Tab label="3. Laboral" />
        </Tabs>

        <form id="add-payroll-employee-form" onSubmit={handleSubmit(onSubmit, onInvalid)}>
          {/* ─── Pestaña: Datos personales ───────────────────────────────── */}
          <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="identificationType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Tipo de identificación</InputLabel>
                      <Select {...field} label="Tipo de identificación">
                        <MenuItem value="">Sin especificar</MenuItem>
                        {identificationTypeOptions.map((o) => (
                          <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>{textField('identificationNumber', 'Número de identificación')}</Grid>
              <Grid item xs={12} md={6}>{dateField('documentIssueDate', 'Fecha de expedición del documento')}</Grid>

              <Grid item xs={12} md={6}>{textField('firstName', 'Primer nombre')}</Grid>
              <Grid item xs={12} md={6}>{textField('middleName', 'Segundo nombre')}</Grid>
              <Grid item xs={12} md={6}>{textField('firstLastName', 'Primer apellido')}</Grid>
              <Grid item xs={12} md={6}>{textField('secondLastName', 'Segundo apellido')}</Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="sex"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Sexo</InputLabel>
                      <Select {...field} label="Sexo">
                        <MenuItem value="">Sin especificar</MenuItem>
                        {sexOptions.map((o) => (
                          <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>{dateField('birthDate', 'Fecha de nacimiento')}</Grid>
            </Grid>
          </Box>

          {/* ─── Pestaña: Contacto ───────────────────────────────────────── */}
          <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>{textField('address', 'Dirección')}</Grid>
              <Grid item xs={12} md={6}>{textField('neighborhood', 'Barrio')}</Grid>
              <Grid item xs={12} md={6}>{textField('phone', 'Teléfono')}</Grid>
              <Grid item xs={12} md={6}>{textField('email', 'Correo electrónico')}</Grid>
              <Grid item xs={12} md={6}>{textField('eps', 'EPS')}</Grid>
              <Grid item xs={12} md={6}>{textField('pensionFund', 'Pensiones (fondo)')}</Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                  Contacto de emergencia
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>{textField('emergencyContactName', 'Nombre del contacto')}</Grid>
              <Grid item xs={12} md={4}>{textField('emergencyContactRelationship', 'Parentesco')}</Grid>
              <Grid item xs={12} md={4}>{textField('emergencyContactPhone', 'Teléfono del contacto')}</Grid>
            </Grid>
          </Box>

          {/* ─── Pestaña: Laboral ────────────────────────────────────────── */}
          <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
            <Grid container spacing={3}>
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

              {/* Fecha de terminación de contrato */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="contractEndDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Fecha terminación contrato"
                      value={field.value ?? null}
                      onChange={field.onChange}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.contractEndDate,
                          helperText: errors.contractEndDate?.message,
                        },
                        field: { clearable: true },
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

              {/* Estado */}
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
          </Box>
        </form>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button variant="text" color="inherit" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Box display="flex" gap={2}>
          {tab > 0 && (
            <Button variant="outlined" startIcon={<NavigateBefore />} onClick={() => setTab(tab - 1)}>
              Anterior
            </Button>
          )}
          {tab < LAST_TAB ? (
            <Button variant="contained" endIcon={<NavigateNext />} onClick={() => setTab(tab + 1)}>
              Siguiente
            </Button>
          ) : (
            <Button
              variant="contained"
              type="submit"
              form="add-payroll-employee-form"
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : 'Agregar a Nómina'}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default AddPayrollEmployeeDialog;
