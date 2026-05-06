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
import { useExpenseTypes, useExpenseType } from '../hooks/useExpenseTypes';
import {
  CreateExpenseTypeDto,
  UpdateExpenseTypeDto,
} from '../../../types/expense-type.types';
import { ROUTES } from '../../../utils/constants';

const expenseTypeSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

type ExpenseTypeFormData = z.infer<typeof expenseTypeSchema>;

const ExpenseTypeFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;
  const { data: expenseType, isLoading: isLoadingType } = useExpenseType(id || '');
  const { createExpenseTypeMutation, updateExpenseTypeMutation } = useExpenseTypes();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseTypeFormData>({
    resolver: zodResolver(expenseTypeSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (expenseType && isEdit) {
      reset({
        name: expenseType.name,
        description: expenseType.description || '',
      });
    }
  }, [expenseType, isEdit, reset]);

  const onSubmit = async (data: ExpenseTypeFormData) => {
    try {
      setError(null);
      if (isEdit && id) {
        await updateExpenseTypeMutation.mutateAsync({
          id,
          data: data as UpdateExpenseTypeDto,
        });
        enqueueSnackbar('Tipo de gasto actualizado correctamente', { variant: 'success' });
      } else {
        await createExpenseTypeMutation.mutateAsync(data as CreateExpenseTypeDto);
        enqueueSnackbar('Tipo de gasto creado correctamente', { variant: 'success' });
      }
      navigate(ROUTES.EXPENSE_TYPES);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar tipo de gasto';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && isLoadingType) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title={isEdit ? 'Editar Tipo de Gasto' : 'Nuevo Tipo de Gasto'}
        breadcrumbs={[
          { label: 'Gastos', path: '#' },
          { label: 'Tipos de Gasto', path: ROUTES.EXPENSE_TYPES },
          { label: isEdit ? 'Editar' : 'Nuevo' },
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
                    placeholder="Ej: Servicios, Materiales, Transporte"
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
                    placeholder="Descripción opcional del tipo de gasto"
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
                  onClick={() => navigate(ROUTES.EXPENSE_TYPES)}
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

export default ExpenseTypeFormPage;
