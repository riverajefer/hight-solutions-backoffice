import React from 'react';
import { Box, Card, CardContent, TextField, Button, Alert } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateRoleDto, UpdateRoleDto } from '../../../types';
import { PermissionsSelector } from './PermissionsSelector';

const roleSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
  initialData?: UpdateRoleDto & { id?: string; permissions?: string[] };
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
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>(
    initialData?.permissions || []
  );

  const { control, handleSubmit, formState: { errors } } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: initialData,
  });

  const handleFormSubmit = async (data: RoleFormData) => {
    await onSubmit(data, selectedPermissions);
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

          <PermissionsSelector
            selectedPermissions={selectedPermissions}
            onSelectPermissions={setSelectedPermissions}
            disabled={isLoading}
          />

          <Button variant="contained" type="submit" fullWidth disabled={isLoading} sx={{ mt: 2 }}>
            {isLoading ? 'Guardando...' : isEdit ? 'Actualizar Rol' : 'Crear Rol'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
