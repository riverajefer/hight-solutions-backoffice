import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Add as AddIcon,
} from '@mui/icons-material';
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
import { formatCurrency } from '../../../utils/formatters';
import {
  formatCurrencyInput,
  parseCurrencyInput,
  roundCurrency,
  sanitizeCurrencyInput,
  toCurrencyInputValue,
} from '../../../utils/currencyInput';
import { useQuery } from '@tanstack/react-query';
import { useAccountPayable, useAccountsPayable } from '../hooks/useAccountsPayable';
import { useSuppliers } from '../../suppliers/hooks/useSuppliers';
import { useExpenseTypes } from '../../expense-orders/hooks/useExpenseOrders';
import { accountsPayableApi } from '../../../api/accounts-payable.api';
import { CreateSupplierModal } from '../../suppliers/components/CreateSupplierModal';
import { WithholdingsFields } from '../../../components/common/WithholdingsFields';
import {
  EMPTY_WITHHOLDINGS,
  computeExpenseTotals,
  getWithholdingPercentages,
  isWithholdingsSelectionEmpty,
  toWithholdingRates,
  withholdingsFromRates,
  type WithholdingsValue,
} from '../../../utils/withholdings';

// Un anticipo de nómina se identifica por tipo "Personal" + subcategoría "Anticipos".
const isAdvanceSelection = (typeName?: string, subcategoryName?: string): boolean =>
  typeName?.trim().toLowerCase() === 'personal' &&
  subcategoryName?.trim().toLowerCase() === 'anticipos';

const schema = z
  .object({
    expenseTypeId: z.string().uuid('Selecciona el tipo de gasto'),
    expenseSubcategoryId: z.string().uuid('Selecciona la subcategoría'),
    beneficiaryUserId: z.string().uuid().optional().or(z.literal('')),
    description: z.string().max(500).optional().or(z.literal('')),
    observations: z.string().optional(),
    totalAmount: z.string().min(1, 'Ingresa el monto total'),
    applyIva: z.boolean().optional(),
    ivaPercentage: z.coerce.number().min(0, 'Mínimo 0%').max(100, 'Máximo 100%').optional(),
    applyWithholdings: z.boolean().optional(),
    retefuente: z.string().optional(),
    retefuenteCustom: z.string().optional(),
    reteICA: z.string().optional(),
    reteIVA: z.string().optional(),
    dueDate: z.date({ invalid_type_error: 'Fecha inválida' }).nullable(),
    supplierId: z.string().uuid().optional().or(z.literal('')),
    isRecurring: z.boolean().optional(),
    recurringFrequency: z.enum(['BIWEEKLY', 'MONTHLY', 'SEMIANNUAL', 'ANNUAL']).optional(),
  })
  .refine((data) => !!data.dueDate, {
    message: 'La fecha de vencimiento es requerida',
    path: ['dueDate'],
  })
  .refine(
    (data) => {
      if (data.isRecurring && !data.recurringFrequency) return false;
      return true;
    },
    { message: 'La frecuencia es requerida cuando el pago es recurrente', path: ['recurringFrequency'] },
  )
  .refine(
    (data) =>
      !isWithholdingsSelectionEmpty({
        apply: data.applyWithholdings ?? false,
        retefuente: data.retefuente ?? '',
        retefuenteCustom: data.retefuenteCustom ?? '',
        reteICA: data.reteICA ?? '',
        reteIVA: data.reteIVA ?? '',
      }),
    { message: 'Debe configurar al menos una retención', path: ['applyWithholdings'] },
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
  const beneficiariesQuery = useQuery({
    queryKey: ['ap-beneficiaries'],
    queryFn: () => accountsPayableApi.getBeneficiaries(),
  });
  const activeEmployees = beneficiariesQuery.data ?? [];

  const filteredExpenseTypes = expenseTypes;

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      expenseTypeId: '',
      expenseSubcategoryId: '',
      beneficiaryUserId: '',
      isRecurring: false,
      totalAmount: '',
      applyIva: false,
      ivaPercentage: 19,
      applyWithholdings: false,
      retefuente: '',
      retefuenteCustom: '',
      reteICA: '',
      reteIVA: '',
      dueDate: null,
    },
  });

  const watchIsRecurring = watch('isRecurring');
  const watchExpenseTypeId = watch('expenseTypeId');
  const watchExpenseSubcategoryId = watch('expenseSubcategoryId');
  const watchApplyIva = watch('applyIva');
  const watchIvaPercentage = watch('ivaPercentage');
  const watchTotalAmount = watch('totalAmount');

  // ─── Retenciones ─────────────────────────────────────────────────────────────
  const withholdings: WithholdingsValue = {
    apply: watch('applyWithholdings') ?? false,
    retefuente: watch('retefuente') ?? '',
    retefuenteCustom: watch('retefuenteCustom') ?? '',
    reteICA: watch('reteICA') ?? '',
    reteIVA: watch('reteIVA') ?? '',
  };

  // El error «Debe configurar al menos una retención» cuelga de
  // `applyWithholdings` pero depende de los tres selects. React Hook Form solo
  // refresca el error del campo que cambió, así que sin este trigger el aviso
  // se queda en pantalla después de elegir la retención.
  useEffect(() => {
    void trigger('applyWithholdings');
  }, [
    trigger,
    withholdings.apply,
    withholdings.retefuente,
    withholdings.retefuenteCustom,
    withholdings.reteICA,
    withholdings.reteIVA,
  ]);

  const handleWithholdingsChange = (next: WithholdingsValue) => {
    setValue('applyWithholdings', next.apply, { shouldValidate: true });
    setValue('retefuente', next.retefuente, { shouldValidate: true });
    setValue('retefuenteCustom', next.retefuenteCustom, { shouldValidate: true });
    setValue('reteICA', next.reteICA, { shouldValidate: true });
    setValue('reteIVA', next.reteIVA, { shouldValidate: true });
  };

  // ─── Desglose (Monto Total se interpreta como base/subtotal) ─────────────────
  const baseAmount = parseCurrencyInput(watchTotalAmount ?? '');
  const ivaPercent = Number(watchIvaPercentage) || 0;
  const totals = computeExpenseTotals(baseAmount, {
    applyIva: watchApplyIva ?? false,
    ivaPercentage: ivaPercent,
    withholdings,
  });
  const withholdingPercentages = getWithholdingPercentages(withholdings);
  const ivaAmount = totals.ivaAmount;
  const grandTotal = totals.total;
  const hasWithholdings =
    totals.retefuenteAmount > 0 || totals.reteICAAmount > 0 || totals.reteIVAAmount > 0;

  const formatCOP = (value: number) => formatCurrency(value);

  const selectedExpenseType = filteredExpenseTypes.find((t: any) => t.id === watchExpenseTypeId);
  const currentSubcategories = selectedExpenseType?.subcategories || [];
  const selectedSubcategory = currentSubcategories.find((s: any) => s.id === watchExpenseSubcategoryId);
  const isAdvance = isAdvanceSelection(selectedExpenseType?.name, selectedSubcategory?.name);

  const employeeLabel = (e: (typeof activeEmployees)[number]) =>
    `${e.user?.firstName ?? ''} ${e.user?.lastName ?? ''}`.trim() || e.user?.email || 'Empleado';

  useEffect(() => {
    if (isEditing && apQuery.data) {
      const ap = apQuery.data;
      const rate = Number(ap.ivaRate) || 0;
      // La base se guarda aparte desde que existen las retenciones; para las
      // cuentas viejas sin `subtotalAmount` todavía hay que deshacer el IVA.
      const storedSubtotal = Number(ap.subtotalAmount ?? 0);
      const baseStored = storedSubtotal > 0
        ? roundCurrency(storedSubtotal)
        : ap.applyIva && rate > 0
          ? roundCurrency(Number(ap.totalAmount) / (1 + rate))
          : roundCurrency(Number(ap.totalAmount));
      const storedWithholdings = withholdingsFromRates(ap);
      reset({
        expenseTypeId: ap.expenseType?.id ?? '',
        expenseSubcategoryId: ap.expenseSubcategory?.id ?? '',
        beneficiaryUserId: ap.beneficiaryUser?.id ?? '',
        description: ap.description,
        observations: ap.observations ?? '',
        totalAmount: toCurrencyInputValue(baseStored),
        applyIva: ap.applyIva ?? false,
        ivaPercentage: ap.applyIva ? Math.round(rate * 100) : 19,
        applyWithholdings: storedWithholdings.apply,
        retefuente: storedWithholdings.retefuente,
        retefuenteCustom: storedWithholdings.retefuenteCustom,
        reteICA: storedWithholdings.reteICA,
        reteIVA: storedWithholdings.reteIVA,
        dueDate: ap.dueDate ? new Date(ap.dueDate) : null,
        supplierId: ap.supplier?.id ?? '',
        isRecurring: ap.isRecurring,
        recurringFrequency: (ap.recurringFrequency as FormValues['recurringFrequency']) ?? undefined,
      });
    }
  }, [isEditing, apQuery.data, reset]);

  const onSubmit = async (values: FormValues) => {
    const base = parseCurrencyInput(values.totalAmount);
    const pct = Number(values.ivaPercentage) || 0;
    const submittedWithholdings: WithholdingsValue = values.applyIva
      ? {
          apply: values.applyWithholdings ?? false,
          retefuente: values.retefuente ?? '',
          retefuenteCustom: values.retefuenteCustom ?? '',
          reteICA: values.reteICA ?? '',
          reteIVA: values.reteIVA ?? '',
        }
      : EMPTY_WITHHOLDINGS;
    const finalTotal = computeExpenseTotals(base, {
      applyIva: values.applyIva ?? false,
      ivaPercentage: pct,
      withholdings: submittedWithholdings,
    }).total;
    const dto = {
      expenseTypeId: values.expenseTypeId,
      expenseSubcategoryId: values.expenseSubcategoryId,
      beneficiaryUserId: isAdvance ? values.beneficiaryUserId || undefined : undefined,
      description: values.description || '',
      observations: values.observations || undefined,
      totalAmount: finalTotal,
      subtotalAmount: base,
      applyIva: values.applyIva ?? false,
      ivaRate: values.applyIva ? pct / 100 : undefined,
      ...toWithholdingRates(submittedWithholdings),
      dueDate: values.dueDate!.toISOString(),
      supplierId: values.supplierId || undefined,
      isRecurring: values.isRecurring ?? false,
      recurringFrequency: values.isRecurring ? values.recurringFrequency : undefined,
    };

    if (isEditing) {
      await updateMutation.mutateAsync(dto);
      navigate(ROUTES.ACCOUNTS_PAYABLE_DETAIL.replace(':id', id));
    } else {
      const created = await createMutation.mutateAsync(dto);
      navigate(ROUTES.ACCOUNTS_PAYABLE_DETAIL.replace(':id', created.id));
    }
  };

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const handleCreateSupplierSuccess = (newSupplier: any) => {
    // Actualizar el valor en el formulario con el nuevo proveedor
    setValue('supplierId', newSupplier.id);
    setSupplierModalOpen(false);
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
                        beneficiaryUserId: '',
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

          {/* Beneficiario del anticipo (solo Personal / Anticipos) */}
          {isAdvance && (
            <Grid item xs={12}>
              <Controller
                name="beneficiaryUserId"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Autocomplete
                    fullWidth
                    options={activeEmployees}
                    loading={beneficiariesQuery.isLoading}
                    getOptionLabel={employeeLabel}
                    value={activeEmployees.find((e) => e.userId === value) ?? null}
                    onChange={(_, newValue) => onChange(newValue?.userId ?? '')}
                    isOptionEqualToValue={(opt, val) => opt.userId === val.userId}
                    noOptionsText="No hay empleados activos"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Empleado beneficiario del anticipo (opcional)"
                        error={!!errors.beneficiaryUserId}
                        helperText={
                          errors.beneficiaryUserId?.message ??
                          'Opcional. Si seleccionas un empleado, el anticipo se vinculará al periodo de nómina en curso para aplicar el descuento (el empleado debe estar incluido en ese periodo).'
                        }
                      />
                    )}
                  />
                )}
              />
            </Grid>
          )}

          {/* Monto total */}
          <Grid item xs={12} sm={6}>
            <Controller
              name="totalAmount"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <TextField
                  {...field}
                  label={watchApplyIva ? 'Monto base (sin IVA) *' : 'Monto Total *'}
                  value={value ? formatCurrencyInput(value) : ''}
                  onChange={(e) => onChange(sanitizeCurrencyInput(e.target.value))}
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

          {/* IVA opcional */}
          <Grid item xs={12} sm={6}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ height: '100%' }}
            >
              <Controller
                name="applyIva"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Aplicar IVA"
                  />
                )}
              />
              {watchApplyIva && (
                <Controller
                  name="ivaPercentage"
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <TextField
                      {...field}
                      label="% IVA"
                      type="number"
                      value={value ?? ''}
                      onChange={(e) => onChange(e.target.value)}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      inputProps={{ min: 0, max: 100, step: 1 }}
                      error={!!errors.ivaPercentage}
                      helperText={errors.ivaPercentage?.message}
                      sx={{ width: 130 }}
                    />
                  )}
                />
              )}
            </Stack>
          </Grid>

          {/* Retenciones */}
          <Grid item xs={12}>
            <WithholdingsFields
              value={withholdings}
              onChange={handleWithholdingsChange}
              applyIva={watchApplyIva ?? false}
              error={errors.applyWithholdings?.message}
            />
          </Grid>

          {/* Desglose con IVA */}
          {watchApplyIva && (
            <Grid item xs={12}>
              <Stack
                spacing={0.5}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                }}
              >
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2">{formatCOP(baseAmount)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    IVA ({ivaPercent}%)
                  </Typography>
                  <Typography variant="body2">{formatCOP(ivaAmount)}</Typography>
                </Stack>
                {totals.retefuenteAmount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Retefuente ({withholdingPercentages.retefuente}%)
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      - {formatCOP(totals.retefuenteAmount)}
                    </Typography>
                  </Stack>
                )}
                {totals.reteICAAmount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      ReteICA ({withholdingPercentages.reteICA}%)
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      - {formatCOP(totals.reteICAAmount)}
                    </Typography>
                  </Stack>
                )}
                {totals.reteIVAAmount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      ReteIVA ({withholdingPercentages.reteIVA}%)
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      - {formatCOP(totals.reteIVAAmount)}
                    </Typography>
                  </Stack>
                )}
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2" fontWeight={700}>
                    {hasWithholdings ? 'Total a pagar (neto de retenciones)' : 'Total a pagar'}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="primary">
                    {formatCOP(grandTotal)}
                  </Typography>
                </Stack>
              </Stack>
            </Grid>
          )}

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
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Controller
                name="supplierId"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Autocomplete
                    fullWidth
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
              <Button
                variant="outlined"
                sx={{ height: 56, minWidth: 56, p: 0 }}
                onClick={() => setSupplierModalOpen(true)}
                title="Crear nuevo proveedor"
              >
                <AddIcon />
              </Button>
            </Stack>
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
                  label="Pago recurrente"
                />
              )}
            />
          </Grid>

          {watchIsRecurring && (
            <Grid item xs={12} sm={4}>
              <Controller
                name="recurringFrequency"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.recurringFrequency}>
                    <InputLabel>Frecuencia *</InputLabel>
                    <Select {...field} value={field.value ?? ''} label="Frecuencia *">
                      <MenuItem value="BIWEEKLY">Quincenal</MenuItem>
                      <MenuItem value="MONTHLY">Mensual</MenuItem>
                      <MenuItem value="SEMIANNUAL">Semestral</MenuItem>
                      <MenuItem value="ANNUAL">Anual</MenuItem>
                    </Select>
                    {errors.recurringFrequency && (
                      <FormHelperText>{errors.recurringFrequency.message}</FormHelperText>
                    )}
                  </FormControl>
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

      <CreateSupplierModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSuccess={handleCreateSupplierSuccess}
      />
    </Box>
  );
}
