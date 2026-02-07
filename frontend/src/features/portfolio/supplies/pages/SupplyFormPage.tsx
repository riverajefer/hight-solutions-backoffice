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
  Grid,
  Typography,
  Divider,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../../components/common/LoadingSpinner';
import {
  useSupplies,
  useSupply,
} from '../hooks/useSupplies';
import { useSupplyCategories } from '../../supply-categories/hooks/useSupplyCategories';
import { useUnitsOfMeasure } from '../../units-of-measure/hooks/useUnitsOfMeasure';
import {
  CreateSupplyDto,
  UpdateSupplyDto,
} from '../../../../types/supply.types';
import { ROUTES } from '../../../../utils/constants';

// Zod schema for validation
const supplySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  sku: z
    .string()
    .max(50, 'El SKU no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  categoryId: z
    .string()
    .min(1, 'La categoría es requerida'),
  purchasePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'El precio debe ser un número válido')
    .optional()
    .or(z.literal('')),
  purchaseUnitId: z
    .string()
    .min(1, 'La unidad de compra es requerida'),
  consumptionUnitId: z
    .string()
    .min(1, 'La unidad de consumo es requerida'),
  conversionFactor: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, 'El factor de conversión debe ser un número válido')
    .optional()
    .or(z.literal('')),
  currentStock: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'El stock actual debe ser un número válido')
    .optional()
    .or(z.literal('')),
  minimumStock: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'El stock mínimo debe ser un número válido')
    .optional()
    .or(z.literal('')),
});

type SupplyFormData = z.infer<typeof supplySchema>;

const SupplyFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;
  const { data: supply, isLoading: isLoadingSupply } = useSupply(id || '');
  const { createSupplyMutation, updateSupplyMutation } = useSupplies();

  // Fetch supply categories for the select dropdown
  const { supplyCategoriesQuery } = useSupplyCategories();
  const supplyCategories = supplyCategoriesQuery.data || [];

  // Fetch units of measure for both purchase and consumption units
  const { unitsOfMeasureQuery } = useUnitsOfMeasure();
  const unitsOfMeasure = unitsOfMeasureQuery.data || [];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplyFormData>({
    resolver: zodResolver(supplySchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      categoryId: '',
      purchasePrice: '',
      purchaseUnitId: '',
      consumptionUnitId: '',
      conversionFactor: '',
      currentStock: '',
      minimumStock: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (supply && isEdit) {
      reset({
        name: supply.name,
        sku: supply.sku || '',
        description: supply.description || '',
        categoryId: supply.categoryId,
        purchasePrice: supply.purchasePrice?.toString() || '',
        purchaseUnitId: supply.purchaseUnitId,
        consumptionUnitId: supply.consumptionUnitId,
        conversionFactor: supply.conversionFactor.toString(),
        currentStock: supply.currentStock.toString(),
        minimumStock: supply.minimumStock.toString(),
      });
    }
  }, [supply, isEdit, reset]);

  const onSubmit = async (data: SupplyFormData) => {
    try {
      setError(null);
      const submitData = {
        ...data,
        purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : undefined,
        conversionFactor: data.conversionFactor ? Number(data.conversionFactor) : undefined,
        currentStock: data.currentStock ? Number(data.currentStock) : undefined,
        minimumStock: data.minimumStock ? Number(data.minimumStock) : undefined,
        sku: data.sku || undefined,
        description: data.description || undefined,
      };

      if (isEdit && id) {
        await updateSupplyMutation.mutateAsync({
          id,
          data: submitData as UpdateSupplyDto,
        });
        enqueueSnackbar('Insumo actualizado correctamente', {
          variant: 'success',
        });
      } else {
        await createSupplyMutation.mutateAsync(
          submitData as CreateSupplyDto
        );
        enqueueSnackbar('Insumo creado correctamente', {
          variant: 'success',
        });
      }
      navigate(ROUTES.SUPPLIES);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar insumo';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && isLoadingSupply) {
    return <LoadingSpinner />;
  }

  if (supplyCategoriesQuery.isLoading || unitsOfMeasureQuery.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Insumo' : 'Nuevo Insumo'}
        breadcrumbs={[
          { label: 'Portafolio', path: '#' },
          { label: 'Insumos', path: ROUTES.SUPPLIES },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <Card sx={{ maxWidth: 900 }}>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
              {/* Información Básica */}
              <Typography variant="h6" color="primary">
                Información Básica
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
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
                        placeholder="Ej: Cemento Portland, Alambre Galvanizado"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="sku"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="SKU"
                        fullWidth
                        error={!!errors.sku}
                        helperText={errors.sku?.message || 'Código único del producto'}
                        placeholder="Ej: CEM-001"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
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
                        {supplyCategories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Descripción"
                        fullWidth
                        multiline
                        rows={2}
                        error={!!errors.description}
                        helperText={errors.description?.message}
                        placeholder="Descripción opcional del insumo"
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Divider />

              {/* Información de Compra */}
              <Typography variant="h6" color="primary">
                Información de Compra
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="purchasePrice"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Precio de Compra"
                        fullWidth
                        type="number"
                        error={!!errors.purchasePrice}
                        helperText={errors.purchasePrice?.message}
                        placeholder="Ej: 50000"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="purchaseUnitId"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Unidad de Compra"
                        fullWidth
                        error={!!errors.purchaseUnitId}
                        helperText={errors.purchaseUnitId?.message}
                        required
                      >
                        <MenuItem value="">
                          <em>Selecciona una unidad</em>
                        </MenuItem>
                        {unitsOfMeasure.map((unit) => (
                          <MenuItem key={unit.id} value={unit.id}>
                            {unit.name} ({unit.abbreviation})
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
              </Grid>

              <Divider />

              {/* Información de Consumo */}
              <Typography variant="h6" color="primary">
                Información de Consumo
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="consumptionUnitId"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Unidad de Consumo"
                        fullWidth
                        error={!!errors.consumptionUnitId}
                        helperText={errors.consumptionUnitId?.message}
                        required
                      >
                        <MenuItem value="">
                          <em>Selecciona una unidad</em>
                        </MenuItem>
                        {unitsOfMeasure.map((unit) => (
                          <MenuItem key={unit.id} value={unit.id}>
                            {unit.name} ({unit.abbreviation})
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="conversionFactor"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Factor de Conversión"
                        fullWidth
                        type="number"
                        error={!!errors.conversionFactor}
                        helperText={errors.conversionFactor?.message || 'Ej: 1 bulto = 50 kg, factor = 50'}
                        placeholder="Ej: 1, 50, 100"
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Divider />

              {/* Inventario */}
              <Typography variant="h6" color="primary">
                Inventario
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="currentStock"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Stock Actual"
                        fullWidth
                        type="number"
                        error={!!errors.currentStock}
                        helperText={errors.currentStock?.message || 'Cantidad actual en inventario'}
                        placeholder="Ej: 100"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="minimumStock"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Stock Mínimo"
                        fullWidth
                        type="number"
                        error={!!errors.minimumStock}
                        helperText={errors.minimumStock?.message || 'Nivel mínimo para alerta'}
                        placeholder="Ej: 10"
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(ROUTES.SUPPLIES)}
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

export default SupplyFormPage;
