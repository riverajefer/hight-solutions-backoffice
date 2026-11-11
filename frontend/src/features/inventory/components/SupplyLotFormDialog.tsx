import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '../../../utils/currencyInput';
import { formatCurrency } from '../../../utils/formatters';
import { PurchaseLineCandidate, SupplyLotSummary } from '../../../types';
import { PurchaseLinePicker } from './PurchaseLinePicker';
import { useCreateSupplyLot } from '../hooks/useSupplyLots';
import { formatLotQuantity } from '../utils/supplyLotFormat';

type CostMode = 'unit' | 'total';

const positive = (message: string) =>
  z.string().refine((v) => parseCurrencyInput(v) > 0, message);

const schema = z.object({
  supplyId: z.string().min(1, 'Selecciona el tipo de rollo'),
  initialQuantity: positive('Indica el largo del rollo'),
  costMode: z.enum(['unit', 'total']),
  cost: positive('Indica el costo'),
  receivedAt: z.date({ invalid_type_error: 'Fecha inválida' }).nullable().refine((d) => Boolean(d), 'Indica la fecha de ingreso'),
  notes: z.string().max(500, 'Máximo 500 caracteres'),
});

type FormValues = z.infer<typeof schema>;

interface SupplyLotFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Insumos controlados por lotes (del resumen). */
  supplies: SupplyLotSummary[];
  /** Insumo preseleccionado (p. ej. el filtro activo de la lista). */
  defaultSupplyId?: string;
}

export const SupplyLotFormDialog: React.FC<SupplyLotFormDialogProps> = ({
  open,
  onClose,
  supplies,
  defaultSupplyId,
}) => {
  const createMutation = useCreateSupplyLot();
  const [purchaseLine, setPurchaseLine] = useState<PurchaseLineCandidate | null>(null);

  const { control, handleSubmit, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplyId: '',
      initialQuantity: '',
      costMode: 'unit',
      cost: '',
      receivedAt: new Date(),
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      supplyId: defaultSupplyId ?? (supplies.length === 1 ? supplies[0].supplyId : ''),
      initialQuantity: '',
      costMode: 'unit',
      cost: '',
      receivedAt: new Date(),
      notes: '',
    });
    setPurchaseLine(null);
  }, [open, defaultSupplyId, supplies, reset]);

  // Al elegir la línea de OG, el valor del rollo es lo que se pagó en ella.
  const selectPurchaseLine = (line: PurchaseLineCandidate | null) => {
    setPurchaseLine(line);
    if (line) {
      setValue('costMode', 'total');
      setValue('cost', String(line.total), { shouldValidate: true });
    }
  };

  const [supplyId, initialQuantity, costMode, cost] = useWatch({
    control,
    name: ['supplyId', 'initialQuantity', 'costMode', 'cost'],
  });

  const supply = supplies.find((s) => s.supplyId === supplyId);
  const unit = supply?.unit.abbreviation ?? 'm';

  // El otro valor se calcula en vivo: el usuario ve el total si digita el costo
  // por metro, o el costo por metro si digita el total de la factura.
  const derived = useMemo(() => {
    const qty = parseCurrencyInput(initialQuantity);
    const value = parseCurrencyInput(cost);
    if (qty <= 0 || value <= 0) return null;
    return costMode === 'unit'
      ? { label: 'Valor total del rollo', value: formatCurrency(Math.round(value * qty * 100) / 100) }
      : { label: `Costo por ${unit}`, value: formatCurrency(value / qty, 2) };
  }, [initialQuantity, cost, costMode, unit]);

  const submit = useSingleFlight(async (values: FormValues) => {
    const amount = parseCurrencyInput(values.cost);
    await createMutation.mutateAsync({
      supplyId: values.supplyId,
      initialQuantity: parseCurrencyInput(values.initialQuantity),
      ...(values.costMode === 'unit' ? { unitCost: amount } : { totalCost: amount }),
      // Día calendario, sin hora: el backend lo interpreta en hora de Colombia.
      receivedAt: format(values.receivedAt as Date, 'yyyy-MM-dd'),
      notes: values.notes.trim() || undefined,
      expenseOrderItemId: purchaseLine?.id,
    });
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar rollo</DialogTitle>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <DialogContent>
          {supplies.length === 0 ? (
            <Alert severity="info">
              No hay insumos controlados por lotes. Activa «Controlar por lotes» en un insumo desde
              Logística → Insumos.
            </Alert>
          ) : (
            <Stack spacing={2} mt={0.5}>
              <Controller
                name="supplyId"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    select
                    label="Tipo de rollo"
                    required
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  >
                    {supplies.map((s) => (
                      <MenuItem key={s.supplyId} value={s.supplyId}>
                        {s.supplyName}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                  name="initialQuantity"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      value={formatCurrencyInput(field.value)}
                      onChange={(e) => field.onChange(sanitizeCurrencyInput(e.target.value))}
                      label="Largo inicial"
                      required
                      fullWidth
                      inputMode="decimal"
                      InputProps={{ endAdornment: <InputAdornment position="end">{unit}</InputAdornment> }}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name="receivedAt"
                  control={control}
                  render={({ field, fieldState }) => (
                    <DatePicker
                      label="Fecha de ingreso"
                      value={field.value}
                      onChange={field.onChange}
                      disableFuture
                      slotProps={{
                        textField: {
                          required: true,
                          fullWidth: true,
                          error: Boolean(fieldState.error),
                          helperText: fieldState.error?.message,
                        },
                      }}
                    />
                  )}
                />
              </Stack>

              <Box>
                <Controller
                  name="costMode"
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={field.value}
                      onChange={(_, v: CostMode | null) => {
                        if (!v) return;
                        field.onChange(v);
                        setValue('cost', '');
                      }}
                      sx={{ mb: 1 }}
                    >
                      <ToggleButton value="unit">Costo por {unit}</ToggleButton>
                      <ToggleButton value="total">Valor total</ToggleButton>
                    </ToggleButtonGroup>
                  )}
                />
                <Controller
                  name="cost"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      value={formatCurrencyInput(field.value)}
                      onChange={(e) => field.onChange(sanitizeCurrencyInput(e.target.value))}
                      label={costMode === 'unit' ? `Costo por ${unit}` : 'Valor total de adquisición'}
                      required
                      fullWidth
                      inputMode="decimal"
                      InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                {derived && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {derived.label}: <strong>{derived.value}</strong>
                    {supply && ` · alerta de inventario bajo por debajo de ${formatLotQuantity(
                      (parseCurrencyInput(initialQuantity) * supply.lowStockPercent) / 100,
                      unit,
                    )}`}
                  </Typography>
                )}
              </Box>

              <PurchaseLinePicker
                value={purchaseLine}
                onChange={selectPurchaseLine}
                helperText="Amárralo para que esa línea de la OG no se cuente también como gasto de la OP"
              />

              <Controller
                name="notes"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Observaciones"
                    multiline
                    minRows={2}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={createMutation.isPending}
            disabled={supplies.length === 0}
          >
            Registrar rollo
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};
