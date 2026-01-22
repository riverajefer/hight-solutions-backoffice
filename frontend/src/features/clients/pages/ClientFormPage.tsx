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
import { useClients, useClient } from '../hooks/useClients';
import { useDepartments, useCitiesByDepartment } from '../../locations/hooks/useLocations';
import { CreateClientDto, UpdateClientDto, Department, City } from '../../../types';

// Zod validation schema with conditional NIT validation
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
  phone: z
    .string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(300, 'La dirección no puede exceder 300 caracteres')
    .optional()
    .or(z.literal('')),
  email: z.string().email('El email debe tener un formato válido'),
  departmentId: z.string().min(1, 'Debe seleccionar un departamento'),
  cityId: z.string().min(1, 'Debe seleccionar una ciudad'),
  personType: z.enum(['NATURAL', 'EMPRESA'], {
    errorMap: () => ({ message: 'Debe seleccionar un tipo de persona' }),
  }),
  nit: z.string().optional().or(z.literal('')),
}).refine(
  (data) => {
    if (data.personType === 'EMPRESA') {
      return data.nit && data.nit.length >= 5;
    }
    return true;
  },
  {
    message: 'El NIT es requerido para tipo EMPRESA (mínimo 5 caracteres)',
    path: ['nit'],
  }
);

type ClientFormData = z.infer<typeof clientSchema>;

const ClientFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;
  const { data: client, isLoading: isLoadingClient } = useClient(id || '');
  const { createClientMutation, updateClientMutation } = useClients();

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
      phone: '',
      address: '',
      email: '',
      departmentId: '',
      cityId: '',
      personType: 'NATURAL',
      nit: '',
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
      setValue('cityId', '');
    }
  }, [watchDepartmentId, setValue, isEdit]);

  // Clear NIT when personType changes to NATURAL
  useEffect(() => {
    if (watchPersonType === 'NATURAL') {
      setValue('nit', '');
    }
  }, [watchPersonType, setValue]);

  // Populate form when editing
  useEffect(() => {
    if (client && isEdit) {
      reset({
        name: client.name,
        manager: client.manager || '',
        phone: client.phone || '',
        address: client.address || '',
        email: client.email,
        departmentId: client.departmentId,
        cityId: client.cityId,
        personType: client.personType,
        nit: client.nit || '',
      });
    }
  }, [client, isEdit, reset]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      setError(null);

      // Clean data: remove empty strings, handle NIT for NATURAL
      const cleanedData = {
        ...data,
        manager: data.manager || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        nit: data.personType === 'EMPRESA' ? data.nit : undefined,
      };

      if (isEdit && id) {
        await updateClientMutation.mutateAsync({
          id,
          data: cleanedData as UpdateClientDto,
        });
        enqueueSnackbar('Cliente actualizado correctamente', { variant: 'success' });
      } else {
        await createClientMutation.mutateAsync(cleanedData as CreateClientDto);
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
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
        breadcrumbs={[
          { label: 'Clientes', path: '/clients' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <Card sx={{ maxWidth: 800 }}>
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

              {/* Manager */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="manager"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Encargado / Gerente"
                      fullWidth
                      error={!!errors.manager}
                      helperText={errors.manager?.message}
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
                      required
                    />
                  )}
                />
              </Grid>

              {/* Phone */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Teléfono"
                      fullWidth
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
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

              {/* NIT - Only shown when personType is EMPRESA */}
              {watchPersonType === 'EMPRESA' && (
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
                        helperText={errors.nit?.message}
                        required
                        placeholder="Ej: 900.123.456-7"
                      />
                    )}
                  />
                </Grid>
              )}

              {/* Buttons */}
              <Grid item xs={12}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/clients')}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
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
