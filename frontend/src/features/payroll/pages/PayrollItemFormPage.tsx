import React, { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  InputAdornment,
  Paper,
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

type FieldName =
  | 'daysWorked' | 'baseSalary'
  | 'overtimeDaytimeHours' | 'overtimeNighttimeHours'
  | 'overtimeDaytimeValue' | 'overtimeNighttimeValue'
  | 'commissions' | 'restDayValue' | 'transportAllowance'
  | 'workdayDiscount' | 'loans' | 'advances' | 'nonPaidDays'
  | 'epsAndPensionDiscount' | 'totalPayment' | 'observations';

type FormValues = Record<FieldName, string>;

const calcTotal = (v: Partial<FormValues>): number => {
  const n = (key: FieldName) => Number(v[key] ?? 0);
  return (
    n('baseSalary') +
    n('overtimeDaytimeValue') +
    n('overtimeNighttimeValue') +
    n('commissions') +
    n('restDayValue') +
    n('transportAllowance') -
    n('workdayDiscount') -
    n('loans') -
    n('advances') -
    n('nonPaidDays') -
    n('epsAndPensionDiscount')
  );
};

const NumberField: React.FC<{
  control: any;
  name: FieldName;
  label: string;
  readOnly?: boolean;
  prefix?: string;
}> = ({ control, name, label, readOnly = false, prefix = '$' }) => (
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
        InputProps={{
          startAdornment: <InputAdornment position="start">{prefix}</InputAdornment>,
          readOnly,
        }}
        sx={readOnly ? { '& .MuiInputBase-root': { bgcolor: 'action.hover' } } : undefined}
      />
    )}
  />
);

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

  // Auto-calc overtime values when hours change
  useEffect(() => {
    if (period?.overtimeDaytimeRate && values.overtimeDaytimeHours) {
      const val = Number(values.overtimeDaytimeHours) * Number(period.overtimeDaytimeRate);
      setValue('overtimeDaytimeValue', val.toFixed(2));
    }
  }, [values.overtimeDaytimeHours, period?.overtimeDaytimeRate]);

  useEffect(() => {
    if (period?.overtimeNighttimeRate && values.overtimeNighttimeHours) {
      const val = Number(values.overtimeNighttimeHours) * Number(period.overtimeNighttimeRate);
      setValue('overtimeNighttimeValue', val.toFixed(2));
    }
  }, [values.overtimeNighttimeHours, period?.overtimeNighttimeRate]);

  // Auto-calc total
  useEffect(() => {
    const total = calcTotal(values);
    setValue('totalPayment', total.toFixed(2));
  }, [
    values.baseSalary, values.overtimeDaytimeValue, values.overtimeNighttimeValue,
    values.commissions, values.restDayValue, values.transportAllowance,
    values.workdayDiscount, values.loans, values.advances, values.nonPaidDays,
    values.epsAndPensionDiscount,
  ]);

  useEffect(() => {
    if (!isNew && itemQuery.data) {
      const item = itemQuery.data;
      reset({
        daysWorked: item.daysWorked?.toString() ?? '',
        baseSalary: item.baseSalary?.toString() ?? '',
        overtimeDaytimeHours: item.overtimeDaytimeHours?.toString() ?? '',
        overtimeNighttimeHours: item.overtimeNighttimeHours?.toString() ?? '',
        overtimeDaytimeValue: item.overtimeDaytimeValue?.toString() ?? '',
        overtimeNighttimeValue: item.overtimeNighttimeValue?.toString() ?? '',
        commissions: item.commissions?.toString() ?? '',
        restDayValue: item.restDayValue?.toString() ?? '',
        transportAllowance: item.transportAllowance?.toString() ?? '',
        workdayDiscount: item.workdayDiscount?.toString() ?? '',
        loans: item.loans?.toString() ?? '',
        advances: item.advances?.toString() ?? '',
        nonPaidDays: item.nonPaidDays?.toString() ?? '',
        epsAndPensionDiscount: item.epsAndPensionDiscount?.toString() ?? '',
        totalPayment: item.totalPayment?.toString() ?? '',
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
    const num = (k: FieldName) => vals[k] ? Number(vals[k]) : undefined;
    try {
      if (isNew) {
        // For new items, need employeeId — redirect to period detail where employee is pre-selected
        enqueueSnackbar('Para agregar un nuevo registro, usa el botón en el detalle del periodo', { variant: 'info' });
        navigate(PATHS.PAYROLL_PERIODS_DETAIL.replace(':id', periodId!));
        return;
      }
      const payload: UpdatePayrollItemDto = {
        daysWorked: num('daysWorked'),
        baseSalary: num('baseSalary'),
        overtimeDaytimeHours: num('overtimeDaytimeHours'),
        overtimeNighttimeHours: num('overtimeNighttimeHours'),
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

      <Paper sx={{ p: 3 }}>
        {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Ingresos</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="daysWorked" label="Días trabajados" prefix="" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="baseSalary" label="Salario base proporcional" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="overtimeDaytimeHours" label="Horas extra diurnas" prefix="h" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="overtimeDaytimeValue" label="Valor extras diurnas" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="overtimeNighttimeHours" label="Horas extra nocturnas" prefix="h" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="overtimeNighttimeValue" label="Valor extras nocturnas" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="commissions" label="Comisiones" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="restDayValue" label="Día de descanso / vacaciones" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="transportAllowance" label="Auxilio de transporte" />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Descuentos</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="workdayDiscount" label="Descuento día laboral" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="loans" label="Préstamos" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="advances" label="Anticipos" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="nonPaidDays" label="Días no remunerados / incapacidad" />
            </Grid>
            <Grid item xs={6} md={3}>
              <NumberField control={control} name="epsAndPensionDiscount" label="EPS y Pensión" />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} md={4}>
              <Typography variant="h6" color="success.main">
                Total a pagar: <strong>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(values.totalPayment || 0))}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Controller
                name="observations"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Observaciones de nómina" multiline rows={2} size="small" />
                )}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="contained" type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Registro'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(PATHS.PAYROLL_PERIODS_DETAIL.replace(':id', periodId!))}>
              Cancelar
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default PayrollItemFormPage;
