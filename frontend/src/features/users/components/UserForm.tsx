import React from 'react';
import { Box, Card, CardContent, TextField, Button, Grid, Alert } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { CreateUserDto, UpdateUserDto } from '../../../types';
import { rolesApi } from '../../../api';
import { Role } from '../../../types';

const userSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().optional(),
  roleId: z.string().min(1, 'El rol es requerido'),
});

type UserFormData = z.infer<typeof userSchema>;

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
  const { control, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: initialData,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
  });

  const handleFormSubmit = async (data: UserFormData) => {
    await onSubmit(data);
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
                label="Email"
                type="email"
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={isLoading || isEdit}
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

          <Button variant="contained" type="submit" fullWidth disabled={isLoading}>
            {isLoading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Usuario'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
