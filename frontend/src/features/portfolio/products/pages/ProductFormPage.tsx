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
  useProducts,
  useProduct,
} from '../hooks/useProducts';
import { useProductCategories } from '../../product-categories/hooks/useProductCategories';
import {
  CreateProductDto,
  UpdateProductDto,
} from '../../../../types/product.types';
import { ROUTES } from '../../../../utils/constants';

// Zod schema for validation
const productSchema = z.object({
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

type ProductFormData = z.infer<typeof productSchema>;

const ProductFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;
  const { data: product, isLoading: isLoadingProduct } = useProduct(
    id || ''
  );
  const { createProductMutation, updateProductMutation } = useProducts();

  // Fetch product categories for the select dropdown
  const { productCategoriesQuery } = useProductCategories();
  const productCategories = productCategoriesQuery.data || [];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      basePrice: '',
      priceUnit: '',
      categoryId: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (product && isEdit) {
      reset({
        name: product.name,
        description: product.description || '',
        basePrice: product.basePrice?.toString() || '',
        priceUnit: product.priceUnit || '',
        categoryId: product.categoryId,
      });
    }
  }, [product, isEdit, reset]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      setError(null);
      const submitData = {
        ...data,
        basePrice: data.basePrice ? Number(data.basePrice) : undefined,
        priceUnit: data.priceUnit || undefined,
        description: data.description || undefined,
      };

      if (isEdit && id) {
        await updateProductMutation.mutateAsync({
          id,
          data: submitData as UpdateProductDto,
        });
        enqueueSnackbar('Producto actualizado correctamente', {
          variant: 'success',
        });
      } else {
        await createProductMutation.mutateAsync(
          submitData as CreateProductDto
        );
        enqueueSnackbar('Producto creado correctamente', {
          variant: 'success',
        });
      }
      navigate(ROUTES.PRODUCTS);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar producto';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && isLoadingProduct) {
    return <LoadingSpinner />;
  }

  if (productCategoriesQuery.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Producto' : 'Nuevo Producto'}
        breadcrumbs={[
          { label: 'Portafolio', path: '#' },
          { label: 'Productos', path: ROUTES.PRODUCTS },
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
                    {productCategories.map((category) => (
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
                    placeholder="Descripción opcional del producto"
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
                    helperText={errors.basePrice?.message || 'Precio base del producto (opcional)'}
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
                  onClick={() => navigate(ROUTES.PRODUCTS)}
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

export default ProductFormPage;
