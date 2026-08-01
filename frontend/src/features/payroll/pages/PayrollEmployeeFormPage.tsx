import React, { useEffect } from 'react';
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Alert,
  Paper,
  Typography,
} from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
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

// ─── Opciones de selects ─────────────────────────────────────────────────────
const identificationTypeOptions: { value: string; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
];

const sexOptions: { value: string; label: string }[] = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'OTHER', label: 'Otro' },
];

// ─── Schema ──────────────────────────────────────────────────────────────────
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
    // Si no se vincula un usuario existente, se crea uno nuevo: requiere nombre,
    // apellido y contraseña. (En edición siempre hay userId, así que no aplica.)
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

// Índices de las pestañas que contienen cada campo, para saltar a la que tenga error.
const FIELD_TAB: Partial<Record<keyof FormValues, number>> = {
  identificationType: 0,
  identificationNumber: 0,
  documentIssueDate: 0,
  firstName: 0,
  middleName: 0,
  firstLastName: 0,
  secondLastName: 0,
  sex: 0,
  birthDate: 0,
  address: 1,
  neighborhood: 1,
  phone: 1,
  email: 1,
  eps: 1,
  pensionFund: 1,
  emergencyContactName: 1,
  emergencyContactRelationship: 1,
  emergencyContactPhone: 1,
  employeeType: 2,
  monthlySalary: 2,
  dailyRate: 2,
  cargoId: 2,
  startDate: 2,
  contractEndDate: 2,
  contractType: 2,
  status: 2,
  notes: 2,
};

// ─── Component ───────────────────────────────────────────────────────────────
const PayrollEmployeeFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState(0);

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

  const { control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: '',
      password: '',
      confirmPassword: '',
      cargoId: '',
      employeeType: 'REGULAR',
      monthlySalary: '',
      dailyRate: '',
      startDate: null,
      contractEndDate: null,
      contractType: '',
      status: 'ACTIVE',
      notes: '',
      identificationType: '',
      identificationNumber: '',
      documentIssueDate: null,
      firstName: '',
      middleName: '',
      firstLastName: '',
      secondLastName: '',
      sex: '',
      birthDate: null,
      address: '',
      neighborhood: '',
      phone: '',
      email: '',
      eps: '',
      pensionFund: '',
      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactPhone: '',
    },
  });

  const employeeType = watch('employeeType');
  const selectedUserId = watch('userId');
  const willCreateUser = !isEdit && !selectedUserId;

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
        contractEndDate: e.contractEndDate ? new Date(e.contractEndDate) : null,
        contractType: e.contractType ?? '',
        status: e.status,
        notes: e.notes ?? '',
        identificationType: e.identificationType ?? '',
        identificationNumber: e.identificationNumber ?? '',
        documentIssueDate: e.documentIssueDate ? new Date(e.documentIssueDate) : null,
        firstName: e.firstName ?? '',
        middleName: e.middleName ?? '',
        firstLastName: e.firstLastName ?? '',
        secondLastName: e.secondLastName ?? '',
        sex: e.sex ?? '',
        birthDate: e.birthDate ? new Date(e.birthDate) : null,
        address: e.address ?? '',
        neighborhood: e.neighborhood ?? '',
        phone: e.phone ?? '',
        email: e.email ?? '',
        eps: e.eps ?? '',
        pensionFund: e.pensionFund ?? '',
        emergencyContactName: e.emergencyContactName ?? '',
        emergencyContactRelationship: e.emergencyContactRelationship ?? '',
        emergencyContactPhone: e.emergencyContactPhone ?? '',
      });
    }
  }, [isEdit, employeeQuery.data, reset]);

  // Al fallar la validación, salta a la primera pestaña que tenga un error.
  const onInvalid = (formErrors: typeof errors) => {
    const target = Object.keys(formErrors)
      .map((k) => FIELD_TAB[k as keyof FormValues])
      .find((t) => t !== undefined);
    if (target !== undefined) setTab(target);
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      // Datos personales compartidos por create/update (null limpia el valor).
      const personal = {
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
      const startDateStr = values.startDate ? values.startDate.toISOString() : '';
      const contractEndDateStr = values.contractEndDate ? values.contractEndDate.toISOString() : null;
      if (isEdit && id) {
        const payload: UpdatePayrollEmployeeDto = {
          cargoId: values.cargoId || undefined,
          employeeType: values.employeeType,
          monthlySalary: values.monthlySalary ? Number(values.monthlySalary.replace(/\D/g, '')) : undefined,
          dailyRate: values.dailyRate ? Number(values.dailyRate.replace(/\D/g, '')) : undefined,
          startDate: startDateStr,
          contractEndDate: contractEndDateStr,
          contractType: (values.contractType as any) || undefined,
          status: values.status,
          notes: values.notes || undefined,
          ...personal,
        };
        await updateMutation.mutateAsync({ id, data: payload });
        enqueueSnackbar('Empleado actualizado correctamente', { variant: 'success' });
      } else {
        const payload: CreatePayrollEmployeeDto = {
          userId: values.userId || undefined,
          // Si no hay usuario, se crea uno nuevo con esta contraseña (rol "user").
          password: values.userId ? undefined : values.password || undefined,
          cargoId: values.cargoId || undefined,
          employeeType: values.employeeType,
          monthlySalary: values.monthlySalary ? Number(values.monthlySalary.replace(/\D/g, '')) : undefined,
          dailyRate: values.dailyRate ? Number(values.dailyRate.replace(/\D/g, '')) : undefined,
          startDate: startDateStr,
          contractEndDate: contractEndDateStr,
          contractType: (values.contractType as any) || undefined,
          status: values.status,
          notes: values.notes || undefined,
          ...personal,
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

        <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
          {/* Usuario del sistema — se selecciona primero y precarga sus datos */}
          {!isEdit && (
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
                        {(usersQuery.data ?? []).map((u: any) => (
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
          )}

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

          {/* ─── Pestaña: Datos personales ─────────────────────────────────── */}
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

          {/* ─── Pestaña: Contacto ─────────────────────────────────────────── */}
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

          {/* ─── Pestaña: Laboral ──────────────────────────────────────────── */}
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

              {/* Fecha de terminación de contrato — DatePicker */}
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
                    <TextField {...field} fullWidth label="Notas adicionales" multiline rows={3} />
                  )}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mt: 4, mb: 2 }} />
          <Stack
            direction={{ xs: 'column-reverse', sm: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Button variant="text" color="inherit" onClick={() => navigate(PATHS.PAYROLL_EMPLOYEES)}>
              Cancelar
            </Button>
            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2}>
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
                <Button variant="contained" type="submit" disabled={isLoading}>
                  {isLoading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Agregar a Nómina'}
                </Button>
              )}
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default PayrollEmployeeFormPage;
