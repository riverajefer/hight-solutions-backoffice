import React, { useEffect } from 'react';
import { Box, Card, CardContent, TextField, Button, Grid, Alert, Autocomplete } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { CreateUserDto, UpdateUserDto } from '../../../types';
import { rolesApi, cargosApi } from '../../../api';
import { Role, Cargo } from '../../../types';

// Schema base del formulario
const userFormSchema = z.object({
  username: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  roleId: z.string().min(1, 'El rol es requerido'),
  cargoId: z.string().optional().nullable(),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  initialData?: UpdateUserDto & { id?: string };
  onSubmit: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  isEdit?: boolean;
}

/**
 * Formulario de usuario
 */
export const UserForm: React.FC<UserFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  error,
  isEdit = false,
}) => {
  // Transform initialData to handle null cargoId
  const defaultValues = initialData
    ? {
        ...initialData,
        cargoId: initialData.cargoId ?? undefined,
      }
    : undefined;

  const { control, handleSubmit, formState: { errors }, setError, watch, setValue } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues,
  });

  const firstName = watch('firstName');
  const lastName = watch('lastName');

  // Auto-populate username from firstName + lastName in create mode
  useEffect(() => {
    if (!isEdit) {
      const preview = [firstName, lastName]
        .filter(Boolean)
        .join('')
        .toLowerCase()
        .replace(/\s+/g, '');
      if (preview) {
        setValue('username', preview);
      }
    }
  }, [firstName, lastName, isEdit, setValue]);

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
  });

  const { data: cargos = [], isLoading: isCargosLoading } = useQuery({
    queryKey: ['cargos'],
    queryFn: () => cargosApi.getAll(),
  });

  const handleFormSubmit = async (data: UserFormData) => {
    // Validaciones adicionales para modo creación
    if (!isEdit) {
      // Validar que password esté presente
      if (!data.password || data.password.trim() === '') {
        setError('password', {
          type: 'manual',
          message: 'La contraseña es requerida'
        });
        return;
      }

      // Validar longitud mínima
      if (data.password.length < 6) {
        setError('password', {
          type: 'manual',
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
        return;
      }

      // Validar que confirmPassword esté presente
      if (!data.confirmPassword || data.confirmPassword.trim() === '') {
        setError('confirmPassword', {
          type: 'manual',
          message: 'La confirmación de contraseña es requerida'
        });
        return;
      }

      // Validar que las contraseñas coincidan
      if (data.password !== data.confirmPassword) {
        setError('confirmPassword', {
          type: 'manual',
          message: 'Las contraseñas no coinciden'
        });
        return;
      }
    }

    // Eliminar confirmPassword y transformar cargoId/email vacío a undefined
    const { confirmPassword, cargoId, email, username, ...rest } = data;
    const submitData = {
      ...rest,
      username: username || undefined,
      email: email || undefined,
      cargoId: cargoId || undefined,
    };
    await onSubmit(submitData);
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email (opcional)"
                type="email"
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={isLoading}
              />
            )}
          />

          <Controller
            name="username"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Usuario"
                fullWidth
                error={!!errors.username}
                helperText={errors.username?.message || (!isEdit ? 'Se auto-genera a partir del nombre y apellido' : undefined)}
                disabled={isLoading}
              />
            )}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nombre"
                    fullWidth
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Apellido"
                    fullWidth
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>
          </Grid>

          {!isEdit && (
            <>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Contraseña"
                    type="password"
                    fullWidth
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    disabled={isLoading}
                  />
                )}
              />
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Confirmar Contraseña"
                    type="password"
                    fullWidth
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    disabled={isLoading}
                  />
                )}
              />
            </>
          )}

          <Controller
            name="roleId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Rol"
                select
                fullWidth
                error={!!errors.roleId}
                helperText={errors.roleId?.message}
                disabled={isLoading}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="">Selecciona un rol</option>
                {(roles as Role[]).map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="cargoId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={cargos as Cargo[]}
                getOptionLabel={(option: Cargo) =>
                  option.area ? `${option.name} (${option.area.name})` : option.name
                }
                value={(cargos as Cargo[]).find((c) => c.id === field.value) || null}
                onChange={(_, newValue) => {
                  field.onChange(newValue?.id || '');
                }}
                loading={isCargosLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cargo (opcional)"
                    error={!!errors.cargoId}
                    helperText={errors.cargoId?.message || 'Selecciona el cargo del usuario'}
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                disabled={isLoading}
              />
            )}
          />

          <Button variant="contained" type="submit" fullWidth disabled={isLoading}>
            {isLoading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Usuario'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
