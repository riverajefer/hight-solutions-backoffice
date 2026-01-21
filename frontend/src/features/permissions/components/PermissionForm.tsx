import React from 'react';
import { Box, Card, CardContent, TextField, Button, Alert } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreatePermissionDto, UpdatePermissionDto } from '../../../types';

const permissionSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
});

type PermissionFormData = z.infer<typeof permissionSchema>;

interface PermissionFormProps {
  initialData?: UpdatePermissionDto & { id?: string };
  onSubmit: (data: CreatePermissionDto | UpdatePermissionDto) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  isEdit?: boolean;
}

/**
 * Formulario de permiso
 */
export const PermissionForm: React.FC<PermissionFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  error,
  isEdit = false,
}) => {
  const { control, handleSubmit, formState: { errors } } = useForm<PermissionFormData>({
    resolver: zodResolver(permissionSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
    },
  });

  const handleFormSubmit = async (data: PermissionFormData) => {
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
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nombre del Permiso"
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={isLoading}
                placeholder="ej: read_users"
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
                placeholder="Descripción del propósito de este permiso"
              />
            )}
          />

          <Button variant="contained" type="submit" fullWidth disabled={isLoading} sx={{ mt: 2 }}>
            {isLoading ? 'Guardando...' : isEdit ? 'Actualizar Permiso' : 'Crear Permiso'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
