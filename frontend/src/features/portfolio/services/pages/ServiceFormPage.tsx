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
  InputAdornment,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../../components/common/LoadingSpinner';
import {
  useServices,
  useService,
} from '../hooks/useServices';
import { useServiceCategories } from '../../service-categories/hooks/useServiceCategories';
import {
  CreateServiceDto,
  UpdateServiceDto,
} from '../../../../types/service.types';
import { ROUTES } from '../../../../utils/constants';

// Zod schema for validation
const serviceSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  basePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'El precio debe ser un número válido')
    .transform(Number)
    .optional()
    .or(z.literal('')),
  priceUnit: z
    .string()
    .max(50, 'La unidad de precio no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
  categoryId: z
    .string()
    .min(1, 'La categoría es requerida'),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

const ServiceFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;
  const { data: service, isLoading: isLoadingService } = useService(
    id || ''
  );
  const { createServiceMutation, updateServiceMutation } = useServices();

  // Fetch service categories for the select dropdown
  const { serviceCategoriesQuery } = useServiceCategories();
  const serviceCategories = serviceCategoriesQuery.data || [];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      basePrice: '' as unknown as number,
      priceUnit: '',
      categoryId: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (service && isEdit) {
      reset({
        name: service.name,
        description: service.description || '',
        basePrice: service.basePrice?.toString() as unknown as number || '' as unknown as number,
        priceUnit: service.priceUnit || '',
        categoryId: service.categoryId,
      });
    }
  }, [service, isEdit, reset]);

  const onSubmit = async (data: ServiceFormData) => {
    try {
      setError(null);
      const submitData = {
        ...data,
        // No usar Number() porque Zod ya transforma. Verificar string vacío en lugar de falsy
        basePrice: data.basePrice !== '' ? data.basePrice : undefined,
        priceUnit: data.priceUnit || undefined,
        description: data.description || undefined,
      };

      if (isEdit && id) {
        await updateServiceMutation.mutateAsync({
          id,
          data: submitData as UpdateServiceDto,
        });
        enqueueSnackbar('Servicio actualizado correctamente', {
          variant: 'success',
        });
      } else {
        await createServiceMutation.mutateAsync(
          submitData as CreateServiceDto
        );
        enqueueSnackbar('Servicio creado correctamente', {
          variant: 'success',
        });
      }
      navigate(ROUTES.SERVICES);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar servicio';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && isLoadingService) {
    return <LoadingSpinner />;
  }

  if (serviceCategoriesQuery.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
        breadcrumbs={[
          { label: 'Portafolio', path: '#' },
          { label: 'Servicios', path: ROUTES.SERVICES },
          { label: isEdit ? 'Editar' : 'Nuevo' },
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
                    placeholder="Ej: Desarrollo Web, Consultoría IT"
                  />
                )}
              />

              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Categoría"
                    fullWidth
                    error={!!errors.categoryId}
                    helperText={errors.categoryId?.message}
                    required
                  >
                    <MenuItem value="">
                      <em>Selecciona una categoría</em>
                    </MenuItem>
                    {serviceCategories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </TextField>
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
                    placeholder="Descripción opcional del servicio"
                  />
                )}
              />

              <Controller
                name="basePrice"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Precio Base"
                    fullWidth
                    type="number"
                    error={!!errors.basePrice}
                    helperText={errors.basePrice?.message || 'Precio base del servicio (opcional)'}
                    placeholder="Ej: 1000000"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                )}
              />

              <Controller
                name="priceUnit"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Unidad de Precio"
                    fullWidth
                    error={!!errors.priceUnit}
                    helperText={errors.priceUnit?.message || 'Ej: por hora, por mes, por proyecto'}
                    placeholder="Ej: por hora, por mes"
                  />
                )}
              />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate(ROUTES.SERVICES)}
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

export default ServiceFormPage;
