import React, { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { usePayrollItems } from '../hooks/usePayrollItems';
import { usePayrollPeriods } from '../hooks/usePayrollPeriods';
import { payrollItemsApi } from '../../../api/payroll-items.api';
import { useQuery } from '@tanstack/react-query';
import type { UpdatePayrollItemDto } from '../../../types';
import { PATHS } from '../../../router/paths';

// ─── Types ───────────────────────────────────────────────────────────────────
type FieldName =
  | 'daysWorked' | 'baseSalary'
  | 'overtimeDaytimeHours' | 'overtimeNighttimeHours'
  | 'overtimeDaytimeValue' | 'overtimeNighttimeValue'
  | 'commissions' | 'restDayValue' | 'transportAllowance'
  | 'workdayDiscount' | 'loans' | 'advances' | 'nonPaidDays'
  | 'epsAndPensionDiscount' | 'totalPayment' | 'observations';

type FormValues = Record<FieldName, string>;

// ─── Currency helpers ────────────────────────────────────────────────────────
const formatCurrencyInput = (rawDigits: string): string => {
  if (!rawDigits) return '';
  const n = parseInt(rawDigits.replace(/\D/g, ''), 10);
  if (isNaN(n)) return '';
  return new Intl.NumberFormat('es-CO').format(n);
};

const formatCOP = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

// Raw integer from form string
const rawNum = (v: string | undefined): number => Number(v?.replace(/\D/g, '') ?? 0);

// ─── Total calculation (reads raw digit strings) ──────────────────────────────
const calcTotal = (v: Partial<FormValues>): number =>
  rawNum(v.baseSalary) +
  rawNum(v.overtimeDaytimeValue) +
  rawNum(v.overtimeNighttimeValue) +
  rawNum(v.commissions) +
  rawNum(v.restDayValue) +
  rawNum(v.transportAllowance) -
  rawNum(v.workdayDiscount) -
  rawNum(v.loans) -
  rawNum(v.advances) -
  rawNum(v.nonPaidDays) -
  rawNum(v.epsAndPensionDiscount);

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Currency field: stores raw digit string, displays formatted COP */
const CurrencyField: React.FC<{
  control: any;
  name: FieldName;
  label: string;
  readOnly?: boolean;
}> = ({ control, name, label, readOnly = false }) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <TextField
        fullWidth
        label={label}
        size="small"
        value={field.value ? formatCurrencyInput(field.value) : ''}
        onChange={readOnly ? undefined : (e) => field.onChange(e.target.value.replace(/\D/g, ''))}
        InputProps={{
          readOnly,
          startAdornment: (
            <InputAdornment position="start">
              <Typography sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>$</Typography>
            </InputAdornment>
          ),
          inputProps: { style: { textAlign: 'right' } },
        }}
        sx={readOnly ? { '& .MuiInputBase-root': { bgcolor: 'action.hover' } } : undefined}
      />
    )}
  />
);

/** Plain numeric field: for hours and days (no currency formatting) */
const NumberField: React.FC<{
  control: any;
  name: FieldName;
  label: string;
  prefix?: string;
}> = ({ control, name, label, prefix = '' }) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <TextField
        {...field}
        fullWidth
        label={label}
        type="number"
        size="small"
        InputProps={
          prefix
            ? {
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{prefix}</Typography>
                  </InputAdornment>
                ),
              }
            : undefined
        }
      />
    )}
  />
);

// ─── Page ────────────────────────────────────────────────────────────────────
const PayrollItemFormPage: React.FC = () => {
  const { periodId, itemId } = useParams<{ periodId: string; itemId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const isNew = itemId === 'new';
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { getPeriodQuery } = usePayrollPeriods();
  const periodQuery = getPeriodQuery(periodId!);
  const period = periodQuery.data;

  const itemQuery = useQuery({
    queryKey: ['payroll-item', itemId],
    queryFn: () => payrollItemsApi.getByPeriod(periodId!).then((items) => items.find((i) => i.id === itemId)),
    enabled: !isNew && !!itemId,
  });

  const { createMutation, updateMutation } = usePayrollItems(periodId!);

  const defaultValues: FormValues = {
    daysWorked: '', baseSalary: '',
    overtimeDaytimeHours: '', overtimeNighttimeHours: '',
    overtimeDaytimeValue: '', overtimeNighttimeValue: '',
    commissions: '', restDayValue: '', transportAllowance: '',
    workdayDiscount: '', loans: '', advances: '', nonPaidDays: '',
    epsAndPensionDiscount: '', totalPayment: '', observations: '',
  };

  const { control, watch, setValue, handleSubmit, reset } = useForm<FormValues>({ defaultValues });
  const values = watch();

  // Auto-calc: horas extra diurnas → valor
  useEffect(() => {
    if (period?.overtimeDaytimeRate && values.overtimeDaytimeHours) {
      const val = Number(values.overtimeDaytimeHours) * Number(period.overtimeDaytimeRate);
      setValue('overtimeDaytimeValue', Math.round(val).toString());
    }
  }, [values.overtimeDaytimeHours, period?.overtimeDaytimeRate]);

  // Auto-calc: horas extra nocturnas → valor
  useEffect(() => {
    if (period?.overtimeNighttimeRate && values.overtimeNighttimeHours) {
      const val = Number(values.overtimeNighttimeHours) * Number(period.overtimeNighttimeRate);
      setValue('overtimeNighttimeValue', Math.round(val).toString());
    }
  }, [values.overtimeNighttimeHours, period?.overtimeNighttimeRate]);

  // Auto-calc total
  useEffect(() => {
    const total = calcTotal(values);
    setValue('totalPayment', Math.round(total).toString());
  }, [
    values.baseSalary, values.overtimeDaytimeValue, values.overtimeNighttimeValue,
    values.commissions, values.restDayValue, values.transportAllowance,
    values.workdayDiscount, values.loans, values.advances, values.nonPaidDays,
    values.epsAndPensionDiscount,
  ]);

  // Load existing item
  useEffect(() => {
    if (!isNew && itemQuery.data) {
      const item = itemQuery.data;
      // Strip decimals from Prisma Decimal strings for COP integer storage
      const toRaw = (v: any) => v != null ? Math.round(Number(v)).toString() : '';
      reset({
        daysWorked: item.daysWorked?.toString() ?? '',
        baseSalary: toRaw(item.baseSalary),
        overtimeDaytimeHours: item.overtimeDaytimeHours?.toString() ?? '',
        overtimeNighttimeHours: item.overtimeNighttimeHours?.toString() ?? '',
        overtimeDaytimeValue: toRaw(item.overtimeDaytimeValue),
        overtimeNighttimeValue: toRaw(item.overtimeNighttimeValue),
        commissions: toRaw(item.commissions),
        restDayValue: toRaw(item.restDayValue),
        transportAllowance: toRaw(item.transportAllowance),
        workdayDiscount: toRaw(item.workdayDiscount),
        loans: toRaw(item.loans),
        advances: toRaw(item.advances),
        nonPaidDays: toRaw(item.nonPaidDays),
        epsAndPensionDiscount: toRaw(item.epsAndPensionDiscount),
        totalPayment: toRaw(item.totalPayment),
        observations: item.observations ?? '',
      });
    }
  }, [isNew, itemQuery.data, reset]);

  const item = itemQuery.data;
  const employeeName = item
    ? `${item.employee?.user?.firstName ?? ''} ${item.employee?.user?.lastName ?? ''}`.trim()
    : 'Empleado';

  const onSubmit = async (vals: FormValues) => {
    setServerError(null);
    const num = (k: FieldName) => vals[k] ? Number(vals[k].replace(/\D/g, '')) : undefined;
    try {
      if (isNew) {
        enqueueSnackbar('Para agregar un nuevo registro, usa el botón en el detalle del periodo', { variant: 'info' });
        navigate(PATHS.PAYROLL_PERIODS_DETAIL.replace(':id', periodId!));
        return;
      }
      const payload: UpdatePayrollItemDto = {
        daysWorked: vals.daysWorked ? Number(vals.daysWorked) : undefined,
        baseSalary: num('baseSalary'),
        overtimeDaytimeHours: vals.overtimeDaytimeHours ? Number(vals.overtimeDaytimeHours) : undefined,
        overtimeNighttimeHours: vals.overtimeNighttimeHours ? Number(vals.overtimeNighttimeHours) : undefined,
        overtimeDaytimeValue: num('overtimeDaytimeValue'),
        overtimeNighttimeValue: num('overtimeNighttimeValue'),
        commissions: num('commissions'),
        restDayValue: num('restDayValue'),
        transportAllowance: num('transportAllowance'),
        workdayDiscount: num('workdayDiscount'),
        loans: num('loans'),
        advances: num('advances'),
        nonPaidDays: num('nonPaidDays'),
        epsAndPensionDiscount: num('epsAndPensionDiscount'),
        totalPayment: num('totalPayment'),
        observations: vals.observations || undefined,
      };
      await updateMutation.mutateAsync({ itemId: itemId!, data: payload });
      enqueueSnackbar('Registro de nómina actualizado', { variant: 'success' });
      navigate(PATHS.PAYROLL_PERIODS_DETAIL.replace(':id', periodId!));
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Error al guardar';
      setServerError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (!isNew && itemQuery.isLoading) return <LoadingSpinner />;
  const isLoading = updateMutation.isPending || createMutation.isPending;
  const totalValue = calcTotal(values);

  return (
    <Box>
      <PageHeader
        title={`Registro de Nómina — ${employeeName}`}
        subtitle={period?.name ?? ''}
        breadcrumbs={[
          { label: 'Periodos', path: PATHS.PAYROLL_PERIODS },
          { label: period?.name ?? 'Periodo', path: PATHS.PAYROLL_PERIODS_DETAIL.replace(':id', periodId!) },
          { label: employeeName },
        ]}
      />

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ── INGRESOS ───────────────────────────────────────────────── */}
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Ingresos</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="daysWorked" label="Días trabajados" />
            </Grid>
            <Grid item xs={6} md={3}>
              <CurrencyField control={control} name="baseSalary" label="Salario base proporcional" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="overtimeDaytimeHours" label="Horas extra diurnas" prefix="h" />
            </Grid>
            <Grid item xs={6} md={3}>
              <CurrencyField control={control} name="overtimeDaytimeValue" label="Valor extras diurnas" readOnly />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="overtimeNighttimeHours" label="Horas extra nocturnas" prefix="h" />
            </Grid>
            <Grid item xs={6} md={3}>
              <CurrencyField control={control} name="overtimeNighttimeValue" label="Valor extras nocturnas" readOnly />
            </Grid>
            <Grid item xs={6} md={3}>
              <CurrencyField control={control} name="commissions" label="Comisiones" />
            </Grid>
            <Grid item xs={6} md={3}>
              <CurrencyField control={control} name="restDayValue" label="Día de descanso / vacaciones" />
            </Grid>
            <Grid item xs={6} md={3}>
              <CurrencyField control={control} name="transportAllowance" label="Auxilio de transporte" />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* ── DESCUENTOS ─────────────────────────────────────────────── */}
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Descuentos</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <CurrencyField control={control} name="workdayDiscount" label="Descuento día laboral" />
            </Grid>
            <Grid item xs={6} md={3}>
              <CurrencyField control={control} name="loans" label="Préstamos" />
            </Grid>
            <Grid item xs={6} md={3}>
              <CurrencyField control={control} name="advances" label="Anticipos" />
            </Grid>
            <Grid item xs={6} md={3}>
              <CurrencyField control={control} name="nonPaidDays" label="Días no remunerados / incapacidad" />
            </Grid>
            <Grid item xs={6} md={3}>
              <CurrencyField control={control} name="epsAndPensionDiscount" label="EPS y Pensión" />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* ── TOTAL + OBSERVACIONES ──────────────────────────────────── */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: totalValue >= 0 ? 'success.soft' : 'error.soft',
                  border: '1px solid',
                  borderColor: totalValue >= 0 ? 'success.main' : 'error.main',
                }}
              >
                <Typography variant="caption" color="text.secondary">Total a pagar</Typography>
                <Typography variant="h5" fontWeight="bold" color={totalValue >= 0 ? 'success.main' : 'error.main'}>
                  {formatCOP(totalValue)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={8}>
              <Controller
                name="observations"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Observaciones de nómina" multiline rows={2} size="small" />
                )}
              />
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
            <Button variant="contained" type="submit" disabled={isLoading} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              {isLoading ? 'Guardando...' : 'Guardar Registro'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(PATHS.PAYROLL_PERIODS_DETAIL.replace(':id', periodId!))} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Cancelar
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default PayrollItemFormPage;
