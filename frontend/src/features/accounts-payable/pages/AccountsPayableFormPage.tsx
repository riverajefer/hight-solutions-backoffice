import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../components/common/PageHeader';
import { ROUTES } from '../../../utils/constants';
import { useAccountPayable, useAccountsPayable } from '../hooks/useAccountsPayable';
import { useSuppliers } from '../../suppliers/hooks/useSuppliers';
import { useExpenseTypes } from '../../expense-orders/hooks/useExpenseOrders';

// ─── Currency helper ──────────────────────────────────────────────────────────
const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CO').format(parseInt(digits, 10));
};

const schema = z
  .object({
    expenseTypeId: z.string().uuid('Selecciona el tipo de gasto'),
    expenseSubcategoryId: z.string().uuid('Selecciona la subcategoría'),
    description: z.string().max(500).optional().or(z.literal('')),
    observations: z.string().optional(),
    totalAmount: z.string().min(1, 'Ingresa el monto total'),
    dueDate: z.date({ invalid_type_error: 'Fecha inválida' }).nullable(),
    supplierId: z.string().uuid().optional().or(z.literal('')),
    isRecurring: z.boolean().optional(),
    recurringDay: z.number().min(1).max(31).optional(),
  })
  .refine((data) => !!data.dueDate, {
    message: 'La fecha de vencimiento es requerida',
    path: ['dueDate'],
  })
  .refine(
    (data) => {
      if (data.isRecurring && !data.recurringDay) return false;
      return true;
    },
    { message: 'El día del mes es requerido cuando el pago es recurrente', path: ['recurringDay'] },
  );

type FormValues = z.infer<typeof schema>;

export default function AccountsPayableFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { query: apQuery } = useAccountPayable(id);
  const { createMutation } = useAccountsPayable();
  const { updateMutation } = useAccountPayable(id);
  const { suppliersQuery } = useSuppliers();
  const suppliers = suppliersQuery.data ?? [];
  const { data: expenseTypes = [] } = useExpenseTypes();

  const filteredExpenseTypes = expenseTypes.filter(
    (t: any) => t.name.toLowerCase() !== 'producción',
  );

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      expenseTypeId: '',
      expenseSubcategoryId: '',
      isRecurring: false,
      totalAmount: '',
      dueDate: null,
    },
  });

  const watchIsRecurring = watch('isRecurring');
  const watchExpenseTypeId = watch('expenseTypeId');

  const selectedExpenseType = filteredExpenseTypes.find((t: any) => t.id === watchExpenseTypeId);
  const currentSubcategories = selectedExpenseType?.subcategories || [];

  useEffect(() => {
    if (isEditing && apQuery.data) {
      const ap = apQuery.data;
      reset({
        expenseTypeId: ap.expenseType?.id ?? '',
        expenseSubcategoryId: ap.expenseSubcategory?.id ?? '',
        description: ap.description,
        observations: ap.observations ?? '',
        totalAmount: String(Math.round(Number(ap.totalAmount))),
        dueDate: ap.dueDate ? new Date(ap.dueDate) : null,
        supplierId: ap.supplier?.id ?? '',
        isRecurring: ap.isRecurring,
        recurringDay: ap.recurringDay ?? undefined,
      });
    }
  }, [isEditing, apQuery.data, reset]);

  const onSubmit = async (values: FormValues) => {
    const dto = {
      expenseTypeId: values.expenseTypeId,
      expenseSubcategoryId: values.expenseSubcategoryId,
      description: values.description || '',
      observations: values.observations || undefined,
      totalAmount: Number(values.totalAmount.replace(/\D/g, '')),
      dueDate: values.dueDate!.toISOString(),
      supplierId: values.supplierId || undefined,
      isRecurring: values.isRecurring ?? false,
      recurringDay: values.isRecurring ? values.recurringDay : undefined,
    };

    if (isEditing) {
      await updateMutation.mutateAsync(dto);
      navigate(ROUTES.ACCOUNTS_PAYABLE_DETAIL.replace(':id', id));
    } else {
      const created = await createMutation.mutateAsync(dto);
      navigate(ROUTES.ACCOUNTS_PAYABLE_DETAIL.replace(':id', created.id));
    }
  };

  if (isEditing && apQuery.isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton height={60} sx={{ mb: 2 }} />
        <Skeleton height={400} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title={isEditing ? 'Editar Cuenta por Pagar' : 'Nueva Cuenta por Pagar'}
        subtitle={isEditing ? apQuery.data?.apNumber : 'Registro de obligación financiera'}
        breadcrumbs={[
          { label: 'Cuentas por Pagar', path: ROUTES.ACCOUNTS_PAYABLE },
          { label: isEditing ? 'Editar' : 'Nueva' },
        ]}
      />

      <Paper sx={{ p: 3, borderRadius: 3, maxWidth: 800 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Información de la cuenta
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2.5} component="form" onSubmit={handleSubmit(onSubmit)}>
          {/* Tipo de Gasto */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="expenseTypeId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.expenseTypeId}>
                  <InputLabel>Tipo de Gasto *</InputLabel>
                  <Select
                    {...field}
                    label="Tipo de Gasto *"
                    onChange={(e) => {
                      field.onChange(e);
                      reset((formValues) => ({
                        ...formValues,
                        expenseSubcategoryId: '',
                      }));
                    }}
                  >
                    {filteredExpenseTypes.map((t: any) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.expenseTypeId && (
                    <FormHelperText>{errors.expenseTypeId.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>

          {/* Subcategoría de Gasto */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="expenseSubcategoryId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.expenseSubcategoryId}>
                  <InputLabel>Subcategoría *</InputLabel>
                  <Select
                    {...field}
                    label="Subcategoría *"
                    disabled={!watchExpenseTypeId}
                  >
                    {currentSubcategories.map((sub: any) => (
                      <MenuItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.expenseSubcategoryId && (
                    <FormHelperText>{errors.expenseSubcategoryId.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>

          {/* Monto total */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="totalAmount"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <TextField
                  {...field}
                  label="Monto Total *"
                  value={value ? formatCurrencyInput(value) : ''}
                  onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ style: { textAlign: 'right' } }}
                  error={!!errors.totalAmount}
                  helperText={errors.totalAmount?.message}
                  fullWidth
                />
              )}
            />
          </Grid>

          {/* Descripción */}
          <Grid item xs={12}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descripción"
                  multiline
                  rows={2}
                  fullWidth
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />
          </Grid>

          {/* Fecha de vencimiento */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Fecha de Vencimiento *"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.dueDate,
                      helperText: (errors.dueDate as { message?: string })?.message,
                    },
                  }}
                />
              )}
            />
          </Grid>

          {/* Proveedor */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="supplierId"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Autocomplete
                  options={suppliers}
                  getOptionLabel={(opt) => opt.name}
                  value={suppliers.find((s) => s.id === value) ?? null}
                  onChange={(_, newValue) => onChange(newValue?.id ?? '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Proveedor / Acreedor"
                      error={!!errors.supplierId}
                      helperText={errors.supplierId?.message}
                    />
                  )}
                />
              )}
            />
          </Grid>

          {/* Pago recurrente */}
          <Grid item xs={12}>
            <Divider sx={{ mb: 1 }} />
            <Controller
              name="isRecurring"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Pago recurrente (mensual)"
                />
              )}
            />
          </Grid>

          {watchIsRecurring && (
            <Grid item xs={12} sm={4}>
              <Controller
                name="recurringDay"
                control={control}
                render={({ field: { onChange, value, ...field } }) => (
                  <TextField
                    {...field}
                    label="Día del mes *"
                    type="number"
                    inputProps={{ min: 1, max: 31 }}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                    error={!!errors.recurringDay}
                    helperText={errors.recurringDay?.message ?? 'Entre 1 y 31'}
                    fullWidth
                  />
                )}
              />
            </Grid>
          )}

          {/* Acciones */}
          <Grid item xs={12}>
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => navigate(ROUTES.ACCOUNTS_PAYABLE)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
              >
                {isEditing ? 'Guardar cambios' : 'Crear Cuenta'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
