import React from 'react';
import { Box, Card, CardContent, TextField, Button, Alert, FormControlLabel, Switch, Typography } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateRoleDto, UpdateRoleDto } from '../../../types';
import { PermissionsSelector } from './PermissionsSelector';

const roleSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  requireTwoFactor: z.boolean().optional(),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
  initialData?: UpdateRoleDto & { id?: string; permissions?: any[] };
  onSubmit: (data: CreateRoleDto | UpdateRoleDto, permissions?: string[]) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  isEdit?: boolean;
}

/**
 * Formulario de rol
 */
export const RoleForm: React.FC<RoleFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  error,
  isEdit = false,
}) => {
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);

  // Línea base para restaurar. En creación queda vacía.
  const initialPermissions = React.useMemo(
    () =>
      // Si recibimos objetos de permiso, extraemos solo los IDs
      initialData?.permissions?.map((p: any) =>
        typeof p === 'string' ? p : p.id,
      ) ?? [],
    [initialData],
  );

  React.useEffect(() => {
    setSelectedPermissions(initialPermissions);
  }, [initialPermissions]);

  const { control, handleSubmit, formState: { errors } } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: initialData,
  });

  const handleFormSubmit = async (data: RoleFormData) => {
    // El interruptor solo existe al editar: el backend lo recibe en el PUT.
    const { requireTwoFactor, ...rest } = data;
    await onSubmit(isEdit ? { ...rest, requireTwoFactor: !!requireTwoFactor } : rest, selectedPermissions);
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
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nombre"
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={isLoading}
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Descripción"
                multiline
                rows={3}
                fullWidth
                error={!!errors.description}
                helperText={errors.description?.message}
                disabled={isLoading}
              />
            )}
          />

          {isEdit && (
            <Controller
              name="requireTwoFactor"
              control={control}
              render={({ field }) => (
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={isLoading}
                      />
                    }
                    label="Exigir verificación en dos pasos"
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6 }}>
                    Los usuarios del rol tendrán que registrar una app autenticadora y escribir su
                    código al entrar. Sus sesiones abiertas no se renuevan hasta que la registren.
                  </Typography>
                </Box>
              )}
            />
          )}

          <PermissionsSelector
            selectedPermissions={selectedPermissions}
            onSelectPermissions={setSelectedPermissions}
            disabled={isLoading}
            initialPermissions={initialPermissions}
          />

          <Button variant="contained" type="submit" fullWidth disabled={isLoading} sx={{ mt: 2 }}>
            {isLoading ? 'Guardando...' : isEdit ? 'Actualizar Rol' : 'Crear Rol'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
