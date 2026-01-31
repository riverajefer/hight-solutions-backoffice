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
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useProductionAreas, useProductionArea } from '../hooks/useProductionAreas';
import { CreateProductionAreaDto, UpdateProductionAreaDto } from '../../../types';

const productionAreaSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

type ProductionAreaFormData = z.infer<typeof productionAreaSchema>;

const ProductionAreaFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;
  const { data: productionArea, isLoading: isLoadingProductionArea } = useProductionArea(id || '');
  const { createProductionAreaMutation, updateProductionAreaMutation } = useProductionAreas();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductionAreaFormData>({
    resolver: zodResolver(productionAreaSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (productionArea && isEdit) {
      reset({
        name: productionArea.name,
        description: productionArea.description || '',
      });
    }
  }, [productionArea, isEdit, reset]);

  const onSubmit = async (data: ProductionAreaFormData) => {
    try {
      setError(null);
      if (isEdit && id) {
        await updateProductionAreaMutation.mutateAsync({
          id,
          data: data as UpdateProductionAreaDto,
        });
        enqueueSnackbar('Área de producción actualizada correctamente', { variant: 'success' });
      } else {
        await createProductionAreaMutation.mutateAsync(data as CreateProductionAreaDto);
        enqueueSnackbar('Área de producción creada correctamente', { variant: 'success' });
      }
      navigate('/production-areas');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar área de producción';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && isLoadingProductionArea) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Área de Producción' : 'Nueva Área de Producción'}
        breadcrumbs={[
          { label: 'Áreas de Producción', path: '/production-areas' },
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
                  />
                )}
              />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/production-areas')}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProductionAreaFormPage;
