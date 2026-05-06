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
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import {
  useExpenseSubcategories,
  useExpenseSubcategory,
  useExpenseTypes,
} from '../hooks/useExpenseTypes';
import {
  CreateExpenseSubcategoryDto,
  UpdateExpenseSubcategoryDto,
} from '../../../types/expense-type.types';
import { ROUTES } from '../../../utils/constants';

const expenseSubcategorySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  expenseTypeId: z.string().uuid('Debes seleccionar un tipo de gasto válido'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

type ExpenseSubcategoryFormData = z.infer<typeof expenseSubcategorySchema>;

const ExpenseSubcategoryFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;
  const { data: subcategory, isLoading: isLoadingSubcategory } = useExpenseSubcategory(
    id || ''
  );
  const { createExpenseSubcategoryMutation, updateExpenseSubcategoryMutation } =
    useExpenseSubcategories();
  const { expenseTypesQuery } = useExpenseTypes();
  const expenseTypes = expenseTypesQuery.data || [];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseSubcategoryFormData>({
    resolver: zodResolver(expenseSubcategorySchema),
    defaultValues: { name: '', expenseTypeId: '', description: '' },
  });

  useEffect(() => {
    if (subcategory && isEdit) {
      reset({
        name: subcategory.name,
        expenseTypeId: subcategory.expenseTypeId,
        description: subcategory.description || '',
      });
    }
  }, [subcategory, isEdit, reset]);

  const onSubmit = async (data: ExpenseSubcategoryFormData) => {
    try {
      setError(null);
      if (isEdit && id) {
        await updateExpenseSubcategoryMutation.mutateAsync({
          id,
          data: data as UpdateExpenseSubcategoryDto,
        });
        enqueueSnackbar('Subcategoría actualizada correctamente', { variant: 'success' });
      } else {
        await createExpenseSubcategoryMutation.mutateAsync(
          data as CreateExpenseSubcategoryDto
        );
        enqueueSnackbar('Subcategoría creada correctamente', { variant: 'success' });
      }
      navigate(ROUTES.EXPENSE_SUBCATEGORIES);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar subcategoría';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && isLoadingSubcategory) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title={isEdit ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
        breadcrumbs={[
          { label: 'Gastos', path: '#' },
          { label: 'Subcategorías de Gasto', path: ROUTES.EXPENSE_SUBCATEGORIES },
          { label: isEdit ? 'Editar' : 'Nueva' },
        ]}
      />

      <Card sx={{ maxWidth: 600 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
              <Controller
                name="expenseTypeId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Tipo de Gasto"
                    fullWidth
                    error={!!errors.expenseTypeId}
                    helperText={errors.expenseTypeId?.message}
                    required
                    disabled={expenseTypesQuery.isLoading}
                  >
                    {expenseTypes.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

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
                    placeholder="Ej: Electricidad, Agua, Internet"
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
                    placeholder="Descripción opcional de la subcategoría"
                  />
                )}
              />

              <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={2}
                justifyContent={{ sm: 'flex-end' }}
              >
                <Button
                  variant="outlined"
                  onClick={() => navigate(ROUTES.EXPENSE_SUBCATEGORIES)}
                  disabled={isSubmitting}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
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

export default ExpenseSubcategoryFormPage;
