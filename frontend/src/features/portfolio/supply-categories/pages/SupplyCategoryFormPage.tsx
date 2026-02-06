import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../../components/common/LoadingSpinner';
import {
  useSupplyCategories,
  useSupplyCategory,
} from '../hooks/useSupplyCategories';
import {
  CreateSupplyCategoryDto,
  UpdateSupplyCategoryDto,
} from '../../../../types/supply-category.types';
import { ROUTES } from '../../../../utils/constants';

// Zod schema for validation
const supplyCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  icon: z
    .string()
    .max(50, 'El icono no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
  sortOrder: z
    .string()
    .regex(/^\d+$/, 'El orden debe ser un número')
    .transform(Number)
    .optional()
    .or(z.literal('')),
});

type SupplyCategoryFormData = z.infer<typeof supplyCategorySchema>;

const SupplyCategoryFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;
  const { data: supplyCategory, isLoading: isLoadingCategory } = useSupplyCategory(
    id || ''
  );
  const { createSupplyCategoryMutation, updateSupplyCategoryMutation } =
    useSupplyCategories();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplyCategoryFormData>({
    resolver: zodResolver(supplyCategorySchema),
    defaultValues: {
      name: '',
      description: '',
      icon: '',
      sortOrder: '' as unknown as number,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (supplyCategory && isEdit) {
      reset({
        name: supplyCategory.name,
        description: supplyCategory.description || '',
        icon: supplyCategory.icon || '',
        sortOrder: supplyCategory.sortOrder.toString() as unknown as number,
      });
    }
  }, [supplyCategory, isEdit, reset]);

  const onSubmit = async (data: SupplyCategoryFormData) => {
    try {
      setError(null);
      const submitData = {
        ...data,
        sortOrder: data.sortOrder ? Number(data.sortOrder) : undefined,
      };

      if (isEdit && id) {
        await updateSupplyCategoryMutation.mutateAsync({
          id,
          data: submitData as UpdateSupplyCategoryDto,
        });
        enqueueSnackbar('Categoría de insumo actualizada correctamente', {
          variant: 'success',
        });
      } else {
        await createSupplyCategoryMutation.mutateAsync(
          submitData as CreateSupplyCategoryDto
        );
        enqueueSnackbar('Categoría de insumo creada correctamente', {
          variant: 'success',
        });
      }
      navigate(ROUTES.SUPPLY_CATEGORIES);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar categoría de insumo';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && isLoadingCategory) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Categoría de Insumo' : 'Nueva Categoría de Insumo'}
        breadcrumbs={[
          { label: 'Portafolio', path: '#' },
          { label: 'Categorías de Insumos', path: ROUTES.SUPPLY_CATEGORIES },
          { label: isEdit ? 'Editar' : 'Nueva' },
        ]}
      />

      <Card sx={{ maxWidth: 600 }}>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
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
                    required
                    placeholder="Ej: Materiales de Construcción, Químicos"
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
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    placeholder="Descripción opcional de la categoría"
                  />
                )}
              />

              <Controller
                name="icon"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Icono"
                    fullWidth
                    error={!!errors.icon}
                    helperText={errors.icon?.message || 'Nombre del icono Material UI (opcional)'}
                    placeholder="Ej: Build, Science, Hardware"
                  />
                )}
              />

              <Controller
                name="sortOrder"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Orden"
                    fullWidth
                    type="number"
                    error={!!errors.sortOrder}
                    helperText={errors.sortOrder?.message || 'Orden de aparición (menor número = mayor prioridad)'}
                    placeholder="Ej: 1, 2, 3..."
                  />
                )}
              />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate(ROUTES.SUPPLY_CATEGORIES)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {isSubmitting
                    ? 'Guardando...'
                    : isEdit
                    ? 'Actualizar'
                    : 'Crear'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SupplyCategoryFormPage;
