import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Stack,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../../components/common/PageHeader';
import { useInventory } from '../hooks/useInventory';
import { suppliesApi } from '../../../api/supplies.api';
import { ROUTES } from '../../../utils/constants';
import type { InventoryMovementType } from '../../../types';

const MANUAL_TYPES: { value: InventoryMovementType; label: string }[] = [
  { value: 'ENTRY', label: 'Entrada (Compra / Reposición)' },
  { value: 'ADJUSTMENT', label: 'Ajuste (Conteo físico / Corrección)' },
  { value: 'RETURN', label: 'Devolución (al stock)' },
  { value: 'INITIAL', label: 'Carga Inicial' },
];

const schema = z
  .object({
    supplyId: z.string().min(1, 'Selecciona un insumo'),
    type: z.enum(['ENTRY', 'ADJUSTMENT', 'RETURN', 'INITIAL'] as const),
    quantity: z
      .string()
      .min(1, 'La cantidad es requerida')
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Debe ser un número positivo'),
    unitCost: z.string().optional(),
    reason: z.string().optional(),
    notes: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'ADJUSTMENT') return !!data.reason && data.reason.trim().length > 0;
      return true;
    },
    { message: 'El motivo es requerido para ajustes', path: ['reason'] },
  );

type FormValues = z.infer<typeof schema>;

const InventoryMovementFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSupplyId = searchParams.get('supplyId') ?? '';

  const { createMutation } = useInventory();

  const suppliesQuery = useQuery({
    queryKey: ['supplies', 'all'],
    queryFn: () => suppliesApi.getAll(),
  });

  const supplies: any[] = Array.isArray(suppliesQuery.data) ? suppliesQuery.data : [];

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplyId: preselectedSupplyId,
      type: 'ENTRY',
      quantity: '',
      unitCost: '',
      reason: '',
      notes: '',
    },
  });

  const selectedType = watch('type');
  const showUnitCost = selectedType === 'ENTRY';
  const showReason = selectedType === 'ADJUSTMENT';

  // Clear unitCost when type changes away from ENTRY
  useEffect(() => {
    if (selectedType !== 'ENTRY') {
      setValue('unitCost', '');
    }
  }, [selectedType, setValue]);

  const onSubmit = async (values: FormValues) => {
    await createMutation.mutateAsync({
      supplyId: values.supplyId,
      type: values.type,
      quantity: Number(values.quantity),
      unitCost: values.unitCost ? Number(values.unitCost) : undefined,
      reason: values.reason || undefined,
      notes: values.notes || undefined,
    });
    navigate(ROUTES.INVENTORY_MOVEMENTS);
  };

  const selectedSupply = supplies.find((s: any) => s.id === watch('supplyId'));

  return (
    <Box>
      <PageHeader
        title="Nuevo Movimiento de Inventario"
        subtitle="Registra una entrada, ajuste, devolución o carga inicial manualmente"
        action={
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(ROUTES.INVENTORY_MOVEMENTS)}
          >
            Volver
          </Button>
        }
      />

      <Card sx={{ maxWidth: 680 }}>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={3}>

              {/* Insumo */}
              <Controller
                name="supplyId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={supplies}
                    getOptionLabel={(opt: any) =>
                      `${opt.name}${opt.sku ? ` (${opt.sku})` : ''}`
                    }
                    value={supplies.find((s: any) => s.id === field.value) ?? null}
                    onChange={(_e, val) => field.onChange(val?.id ?? '')}
                    loading={suppliesQuery.isLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Insumo *"
                        error={!!errors.supplyId}
                        helperText={errors.supplyId?.message}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {suppliesQuery.isLoading && <CircularProgress size={18} />}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              />

              {/* Stock actual */}
              {selectedSupply && (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  <Typography variant="body2">
                    Stock actual:{' '}
                    <strong>
                      {Number(selectedSupply.currentStock ?? 0).toFixed(2)}{' '}
                      {selectedSupply.unitOfMeasure?.abbreviation ?? ''}
                    </strong>
                    {selectedSupply.minimumStock != null && (
                      <>
                        {' — '}Mínimo:{' '}
                        <strong>
                          {Number(selectedSupply.minimumStock).toFixed(2)}{' '}
                          {selectedSupply.unitOfMeasure?.abbreviation ?? ''}
                        </strong>
                      </>
                    )}
                  </Typography>
                </Alert>
              )}

              {/* Tipo de movimiento */}
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Tipo de movimiento *"
                    error={!!errors.type}
                    helperText={errors.type?.message}
                  >
                    {MANUAL_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              {/* Cantidad */}
              <Controller
                name="quantity"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Cantidad *"
                    type="number"
                    inputProps={{ min: 0.01, step: 0.01 }}
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
                  />
                )}
              />

              {/* Costo unitario (solo ENTRY) */}
              {showUnitCost && (
                <Controller
                  name="unitCost"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Costo unitario (opcional)"
                      type="number"
                      inputProps={{ min: 0, step: 0.01 }}
                      error={!!errors.unitCost}
                      helperText={errors.unitCost?.message ?? 'Precio de compra en esta entrada'}
                    />
                  )}
                />
              )}

              {/* Motivo (requerido para ADJUSTMENT) */}
              {showReason && (
                <Controller
                  name="reason"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Motivo del ajuste *"
                      multiline
                      rows={2}
                      error={!!errors.reason}
                      helperText={errors.reason?.message ?? 'Describe la razón del ajuste de inventario'}
                    />
                  )}
                />
              )}

              {/* Notas */}
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notas adicionales (opcional)"
                    multiline
                    rows={2}
                    error={!!errors.notes}
                    helperText={errors.notes?.message}
                  />
                )}
              />

              {/* Acciones */}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate(ROUTES.INVENTORY_MOVEMENTS)}
                  disabled={isSubmitting || createMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={
                    isSubmitting || createMutation.isPending ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <SaveIcon />
                    )
                  }
                  disabled={isSubmitting || createMutation.isPending}
                >
                  Registrar Movimiento
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default InventoryMovementFormPage;
