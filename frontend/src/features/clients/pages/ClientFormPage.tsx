import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Alert,
  MenuItem,
  Grid,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { PhoneInputWithCountry } from '../../../components/common/PhoneInputWithCountry';
import { useClients, useClient } from '../hooks/useClients';
import { useDepartments, useCitiesByDepartment } from '../../locations/hooks/useLocations';
import { useUsers } from '../../users/hooks/useUsers';
import { CreateClientDto, UpdateClientDto, Department, City } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';

// Zod validation schema with conditional validations
const clientSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(200, 'El nombre no puede exceder 200 caracteres'),
  manager: z
    .string()
    .max(200, 'El encargado no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('')),
  encargado: z
    .string()
    .max(200, 'El encargado no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .min(6, 'El número de celular debe tener al menos 6 dígitos')
    .max(20, 'El número de celular no puede exceder 20 dígitos'),
  landlinePhone: z
    .string()
    .length(10, 'El teléfono fijo debe tener exactamente 10 dígitos')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(300, 'La dirección no puede exceder 300 caracteres')
    .optional()
    .or(z.literal('')),
  email: z.string().email('El email debe tener un formato válido').optional().or(z.literal('')),
  departmentId: z.string().min(1, 'Debe seleccionar un departamento'),
  cityId: z.string().min(1, 'Debe seleccionar una ciudad'),
  personType: z.enum(['NATURAL', 'EMPRESA'], {
    errorMap: () => ({ message: 'Debe seleccionar un tipo de persona' }),
  }),
  nit: z.string().max(12, 'El NIT no puede exceder 12 caracteres').optional().or(z.literal('')),
  cedula: z.string().max(12, 'La cédula no puede exceder 12 caracteres').optional().or(z.literal('')),
  specialCondition: z
    .string()
    .max(500, 'La condición especial no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

type ClientFormData = z.infer<typeof clientSchema>;

const ClientFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);
  const { hasPermission, user } = useAuthStore();
  const isAdmin = user?.role?.name === 'admin';
  const canEditSpecialCondition = hasPermission(PERMISSIONS.UPDATE_CLIENT_SPECIAL_CONDITION);
  const canAssignAdvisor = isAdmin || hasPermission(PERMISSIONS.APPROVE_CLIENT_OWNERSHIP_AUTH);

  // Advisor state (managed outside Zod schema — admin-only field)
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null | undefined>(undefined);

  const isEdit = !!id;
  const { data: client, isLoading: isLoadingClient } = useClient(id || '');
  const { createClientMutation, updateClientMutation, updateSpecialConditionMutation } = useClients();

  // Users (for advisor selection — admin only)
  const { usersQuery } = useUsers({ enabled: canAssignAdvisor });
  const users = usersQuery.data || [];

  // Location data
  const { data: departments, isLoading: isLoadingDepartments } = useDepartments();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      manager: '',
      encargado: '',
      phone: '',
      landlinePhone: '',
      address: '',
      email: '',
      departmentId: '',
      cityId: '',
      personType: 'NATURAL',
      nit: '',
      cedula: '',
      specialCondition: '',
    },
  });

  // Watch for department and personType changes
  const watchDepartmentId = watch('departmentId');
  const watchPersonType = watch('personType');

  // Fetch cities when department changes
  const { data: cities, isLoading: isLoadingCities } = useCitiesByDepartment(watchDepartmentId);

  // Reset city when department changes (only if not editing or department actually changed)
  useEffect(() => {
    if (watchDepartmentId && !isEdit) {
      // Check if it's the default Cundinamarca -> Bogotá case
      const cundinamarca = departments?.find(d => d.name.toLowerCase().includes('cundinamarca'));
      if (watchDepartmentId === cundinamarca?.id) {
        const bogota = cities?.find(c => c.name.toLowerCase().includes('bogotá') || c.name.toLowerCase().includes('bogota'));
        if (bogota && !watch('cityId')) {
          setValue('cityId', bogota.id);
          return;
        }
      }
      setValue('cityId', '');
    }
  }, [watchDepartmentId, setValue, isEdit, departments, cities, watch]);

  // Set default Department (Cundinamarca)
  useEffect(() => {
    if (departments && departments.length > 0 && !watchDepartmentId && !isEdit) {
      const cundinamarca = departments.find(d => 
        d.name.toLowerCase().includes('cundinamarca')
      );
      if (cundinamarca) {
        setValue('departmentId', cundinamarca.id);
      }
    }
  }, [departments, watchDepartmentId, setValue, isEdit]);

  // Clear NIT/Cedula when personType changes
  useEffect(() => {
    if (watchPersonType === 'NATURAL') {
      setValue('nit', '');
    } else if (watchPersonType === 'EMPRESA') {
      setValue('cedula', '');
    }
  }, [watchPersonType, setValue]);

  // Populate form when editing
  useEffect(() => {
    if (client && isEdit) {
      reset({
        name: client.name,
        manager: client.manager || '',
        encargado: client.encargado || '',
        phone: client.phone || '',
        landlinePhone: client.landlinePhone || '',
        address: client.address || '',
        email: client.email || '',
        departmentId: client.departmentId,
        cityId: client.cityId,
        personType: client.personType,
        nit: client.nit || '',
        cedula: client.cedula || '',
        specialCondition: client.specialCondition || '',
      });
      // Pre-populate advisor state
      setSelectedAdvisorId(client.advisorId ?? null);
    }
  }, [client, isEdit, reset]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      setError(null);

      // Clean data: remove empty strings, handle NIT/Cedula based on personType
      // specialCondition is handled separately via its own endpoint
      const { specialCondition, ...rest } = data;
      const cleanedData = {
        ...rest,
        manager: rest.manager || undefined,
        encargado: rest.encargado || undefined,
        landlinePhone: rest.landlinePhone || undefined,
        address: rest.address || undefined,
        email: rest.email || undefined,
        nit: (rest.personType === 'EMPRESA' && rest.nit) ? rest.nit : undefined,
        cedula: (rest.personType === 'NATURAL' && rest.cedula) ? rest.cedula : undefined,
      };

      if (isEdit && id) {
        const updatePayload: UpdateClientDto = {
          ...(cleanedData as UpdateClientDto),
          // Include advisorId only if admin/authorized and it was explicitly set
          ...(canAssignAdvisor && selectedAdvisorId !== undefined
            ? { advisorId: selectedAdvisorId }
            : {}),
        };
        await updateClientMutation.mutateAsync({
          id,
          data: updatePayload,
        });
        // Update special condition separately if user has permission
        if (canEditSpecialCondition) {
          await updateSpecialConditionMutation.mutateAsync({
            id,
            data: { specialCondition: specialCondition || null },
          });
        }
        enqueueSnackbar('Cliente actualizado correctamente', { variant: 'success' });
      } else {
        const created = await createClientMutation.mutateAsync(cleanedData as CreateClientDto);
        // Set special condition on new client if user has permission and value is provided
        if (canEditSpecialCondition && specialCondition) {
          await updateSpecialConditionMutation.mutateAsync({
            id: created.id,
            data: { specialCondition },
          });
        }
        enqueueSnackbar('Cliente creado correctamente', { variant: 'success' });
      }
      navigate('/clients');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar cliente';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && isLoadingClient) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title={isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
        breadcrumbs={[
          { label: 'Clientes', path: '/clients' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <Card sx={{ maxWidth: 800, p: { xs: 2, sm: 3 } }}>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              {/* Name */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nombre del Cliente"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      required
                    />
                  )}
                />
              </Grid>

              {/* Encargado */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="encargado"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Encargado"
                      fullWidth
                      error={!!errors.encargado}
                      helperText={errors.encargado?.message}
                      placeholder="Persona de contacto"
                    />
                  )}
                />
              </Grid>

              {/* Email */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                    />
                  )}
                />
              </Grid>

              {/* Phone (Celular) */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInputWithCountry
                      value={field.value}
                      onChange={field.onChange}
                      label="Número de celular"
                      required
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
                    />
                  )}
                />
              </Grid>

              {/* Landline Phone (Teléfono fijo) */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="landlinePhone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Teléfono fijo"
                      fullWidth
                      error={!!errors.landlinePhone}
                      helperText={errors.landlinePhone?.message || 'Máximo 10 dígitos'}
                      placeholder="6012345678"
                      inputProps={{ maxLength: 10 }}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        field.onChange(val);
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Address */}
              <Grid item xs={12}>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Dirección"
                      fullWidth
                      error={!!errors.address}
                      helperText={errors.address?.message}
                    />
                  )}
                />
              </Grid>

              {/* Department */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={departments || []}
                      getOptionLabel={(option: Department) => option.name}
                      value={departments?.find((d) => d.id === field.value) || null}
                      onChange={(_, newValue) => {
                        field.onChange(newValue?.id || '');
                        // Reset city when department changes
                        setValue('cityId', '');
                      }}
                      loading={isLoadingDepartments}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Departamento"
                          error={!!errors.departmentId}
                          helperText={errors.departmentId?.message}
                          required
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {isLoadingDepartments ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                    />
                  )}
                />
              </Grid>

              {/* City */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="cityId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={cities || []}
                      getOptionLabel={(option: City) => option.name}
                      value={cities?.find((c) => c.id === field.value) || null}
                      onChange={(_, newValue) => {
                        field.onChange(newValue?.id || '');
                      }}
                      loading={isLoadingCities}
                      disabled={!watchDepartmentId}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Ciudad"
                          error={!!errors.cityId}
                          helperText={
                            errors.cityId?.message ||
                            (!watchDepartmentId ? 'Seleccione primero un departamento' : '')
                          }
                          required
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {isLoadingCities ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                    />
                  )}
                />
              </Grid>

              {/* Person Type */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="personType"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Tipo de Persona"
                      fullWidth
                      error={!!errors.personType}
                      helperText={errors.personType?.message}
                      required
                    >
                      <MenuItem value="NATURAL">Persona Natural</MenuItem>
                      <MenuItem value="EMPRESA">Empresa</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>

              {/* Cédula o NIT - Conditional based on personType */}
              {watchPersonType === 'NATURAL' ? (
                <Grid item xs={12} md={6}>
                  <Controller
                    name="cedula"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Cédula o nit"
                        fullWidth
                        error={!!errors.cedula}
                        helperText={errors.cedula?.message || 'Máximo 12 caracteres'}
                        placeholder="1234567890-1"
                        inputProps={{ maxLength: 12 }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9-]/g, '').slice(0, 12);
                          field.onChange(val);
                        }}
                      />
                    )}
                  />
                </Grid>
              ) : (
                <Grid item xs={12} md={6}>
                  <Controller
                    name="nit"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="NIT"
                        fullWidth
                        error={!!errors.nit}
                        helperText={errors.nit?.message || 'Máximo 12 caracteres (ej: 900123456-7)'}

                        placeholder="900.123.456-7"
                        inputProps={{ maxLength: 12 }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9-]/g, '').slice(0, 12);
                          field.onChange(val);
                        }}
                      />
                    )}
                  />
                </Grid>
              )}

              {/* Manager - Only shown when personType is EMPRESA */}
              {watchPersonType === 'EMPRESA' && (
                <Grid item xs={12} md={6}>
                  <Controller
                    name="manager"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Representante Legal"
                        fullWidth
                        error={!!errors.manager}
                        helperText={errors.manager?.message}
                        placeholder="Nombre del representante legal"
                      />
                    )}
                  />
                </Grid>
              )}

              {/* Asesor responsable — solo visible para admin */}
              {canAssignAdvisor && (
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={users}
                    getOptionLabel={(option) =>
                      option.firstName && option.lastName
                        ? `${option.firstName} ${option.lastName} (${option.email})`
                        : option.email ?? ''
                    }
                    value={users.find((u) => u.id === selectedAdvisorId) || null}
                    onChange={(_, newValue) => {
                      setSelectedAdvisorId(newValue?.id ?? null);
                    }}
                    loading={usersQuery.isLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Asesor responsable"
                        helperText="Asesor dueño de este cliente. Dejar vacío para sin asignar."
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {usersQuery.isLoading ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    noOptionsText="No se encontraron usuarios"
                    clearText="Quitar asesor"
                  />
                </Grid>
              )}

              {/* Special Condition */}
              <Grid item xs={12}>
                <Controller
                  name="specialCondition"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Condición especial"
                      fullWidth
                      multiline
                      rows={3}
                      disabled={!canEditSpecialCondition}
                      error={!!errors.specialCondition}
                      helperText={
                        errors.specialCondition?.message ||
                        (!canEditSpecialCondition
                          ? 'Requiere permiso especial para editar'
                          : 'Información sensible: acuerdos, descuentos u observaciones especiales del cliente')
                      }
                      inputProps={{ maxLength: 500 }}
                    />
                  )}
                />
              </Grid>

              {/* Buttons */}
              <Grid item xs={12}>
                <Stack
                  direction={{ xs: 'column-reverse', sm: 'row' }}
                  spacing={2}
                  justifyContent={{ sm: 'flex-end' }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/clients')}
                    disabled={isSubmitting}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    {isSubmitting
                      ? 'Guardando...'
                      : isEdit
                        ? 'Actualizar'
                        : 'Crear'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ClientFormPage;
