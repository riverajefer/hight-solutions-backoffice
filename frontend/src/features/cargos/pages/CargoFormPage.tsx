import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Alert,
  Autocomplete,
} from '@mui/material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useCargos, useCargo } from '../hooks/useCargos';
import { useAreas } from '../../areas/hooks/useAreas';
import { CreateCargoDto, UpdateCargoDto, Area } from '../../../types';

const cargoSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  areaId: z.string().min(1, 'Debe seleccionar un área'),
});

type CargoFormData = z.infer<typeof cargoSchema>;

const CargoFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  // Obtener el areaId si viene desde la página de detalle de área
  const preselectedAreaId = (location.state as { areaId?: string })?.areaId;

  const isEdit = !!id;
  const { data: cargo, isLoading: isLoadingCargo } = useCargo(id || '');
  const { createCargoMutation, updateCargoMutation } = useCargos();
  const { areasQuery } = useAreas();
  const areas = areasQuery.data || [];

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CargoFormData>({
    resolver: zodResolver(cargoSchema),
    defaultValues: {
      name: '',
      description: '',
      areaId: preselectedAreaId || '',
    },
  });

  useEffect(() => {
    if (cargo && isEdit) {
      reset({
        name: cargo.name,
        description: cargo.description || '',
        areaId: cargo.areaId,
      });
    }
  }, [cargo, isEdit, reset]);

  useEffect(() => {
    if (preselectedAreaId && !isEdit) {
      setValue('areaId', preselectedAreaId);
    }
  }, [preselectedAreaId, isEdit, setValue]);

  const onSubmit = async (data: CargoFormData) => {
    try {
      setError(null);
      if (isEdit && id) {
        await updateCargoMutation.mutateAsync({
          id,
          data: data as UpdateCargoDto,
        });
        enqueueSnackbar('Cargo actualizado correctamente', { variant: 'success' });
      } else {
        await createCargoMutation.mutateAsync(data as CreateCargoDto);
        enqueueSnackbar('Cargo creado correctamente', { variant: 'success' });
      }
      navigate('/cargos');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar cargo';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && isLoadingCargo) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Cargo' : 'Nuevo Cargo'}
        breadcrumbs={[
          { label: 'Cargos', path: '/cargos' },
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
                  />
                )}
              />

              <Controller
                name="areaId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={areas}
                    getOptionLabel={(option: Area) => option.name}
                    value={areas.find((a) => a.id === field.value) || null}
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.id || '');
                    }}
                    loading={areasQuery.isLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Área"
                        error={!!errors.areaId}
                        helperText={errors.areaId?.message}
                        required
                      />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
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
                  onClick={() => navigate('/cargos')}
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

export default CargoFormPage;
