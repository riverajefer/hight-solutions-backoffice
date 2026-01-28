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
  useUnitsOfMeasure,
  useUnitOfMeasure,
} from '../hooks/useUnitsOfMeasure';
import {
  CreateUnitOfMeasureDto,
  UpdateUnitOfMeasureDto,
} from '../../../../types/unit-of-measure.types';
import { ROUTES } from '../../../../utils/constants';

// Zod schema for validation
const unitOfMeasureSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  abbreviation: z
    .string()
    .min(1, 'La abreviatura es requerida')
    .max(10, 'La abreviatura no puede exceder 10 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

type UnitOfMeasureFormData = z.infer<typeof unitOfMeasureSchema>;

const UnitOfMeasureFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;
  const { data: unitOfMeasure, isLoading: isLoadingUnit } = useUnitOfMeasure(
    id || ''
  );
  const { createUnitOfMeasureMutation, updateUnitOfMeasureMutation } =
    useUnitsOfMeasure();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UnitOfMeasureFormData>({
    resolver: zodResolver(unitOfMeasureSchema),
    defaultValues: {
      name: '',
      abbreviation: '',
      description: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (unitOfMeasure && isEdit) {
      reset({
        name: unitOfMeasure.name,
        abbreviation: unitOfMeasure.abbreviation,
        description: unitOfMeasure.description || '',
      });
    }
  }, [unitOfMeasure, isEdit, reset]);

  const onSubmit = async (data: UnitOfMeasureFormData) => {
    try {
      setError(null);
      if (isEdit && id) {
        await updateUnitOfMeasureMutation.mutateAsync({
          id,
          data: data as UpdateUnitOfMeasureDto,
        });
        enqueueSnackbar('Unidad de medida actualizada correctamente', {
          variant: 'success',
        });
      } else {
        await createUnitOfMeasureMutation.mutateAsync(
          data as CreateUnitOfMeasureDto
        );
        enqueueSnackbar('Unidad de medida creada correctamente', {
          variant: 'success',
        });
      }
      navigate(ROUTES.UNITS_OF_MEASURE);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar unidad de medida';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && isLoadingUnit) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}
        breadcrumbs={[
          { label: 'Portafolio', path: '#' },
          { label: 'Unidades de Medida', path: ROUTES.UNITS_OF_MEASURE },
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
                    placeholder="Ej: metro, litro, kilogramo"
                  />
                )}
              />

              <Controller
                name="abbreviation"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Abreviatura"
                    fullWidth
                    error={!!errors.abbreviation}
                    helperText={errors.abbreviation?.message}
                    required
                    placeholder="Ej: m, L, kg"
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
                    placeholder="Descripción opcional de la unidad de medida"
                  />
                )}
              />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate(ROUTES.UNITS_OF_MEASURE)}
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

export default UnitOfMeasureFormPage;
