import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PlaylistAddCheck as ApplyIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import type { GridColDef } from '@mui/x-data-grid';
import { useSnackbar } from 'notistack';
import { DataTable } from '../../../components/common/DataTable';
import { PageHeader } from '../../../components/common/PageHeader';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { isRowPending, isAnyRowPending } from '../../../utils/mutationState';
import { usePayrollDeductions } from '../hooks/usePayrollDeductions';
import { usePayrollPeriods } from '../hooks/usePayrollPeriods';
import {
  PAYROLL_DEDUCTION_STATUS_LABELS,
  type PayrollDeduction,
  type PayrollDeductionFilters,
  type PayrollDeductionStatus,
} from '../../../types/payroll-deduction.types';

const employeeName = (deduction: PayrollDeduction): string => {
  const propio = [deduction.employee.firstName, deduction.employee.firstLastName]
    .filter(Boolean)
    .join(' ');
  if (propio) return propio;
  const usuario = [deduction.employee.user?.firstName, deduction.employee.user?.lastName]
    .filter(Boolean)
    .join(' ');
  return usuario || deduction.employee.user?.email || 'Sin nombre';
};

type DialogState =
  | { kind: 'reject' | 'cancel' | 'apply'; deduction: PayrollDeduction }
  | null;

/**
 * Bandeja de descuentos por nómina.
 *
 * Aprobar autoriza el descuento; aplicar es lo que de verdad mueve dinero: resta
 * el valor de la quincena del empleado y salda la OP. Por eso van separados y
 * cada uno pide su propio permiso.
 */
const PayrollDeductionsPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuthStore();
  const canApprove = hasPermission(PERMISSIONS.APPROVE_PAYROLL_DEDUCTIONS);
  const canApply = hasPermission(PERMISSIONS.APPLY_PAYROLL_DEDUCTIONS);

  const [filters, setFilters] = useState<PayrollDeductionFilters>({
    page: 1,
    limit: 25,
  });
  const [dialog, setDialog] = useState<DialogState>(null);
  const [reason, setReason] = useState('');
  const [periodId, setPeriodId] = useState('');

  const {
    deductionsQuery,
    approveMutation,
    rejectMutation,
    applyMutation,
    cancelMutation,
  } = usePayrollDeductions(filters);
  const { periodsQuery } = usePayrollPeriods();

  // Un periodo pagado ya se le entregó al empleado: el backend rechaza aplicar
  // sobre él, así que no se ofrece.
  const openPeriods = (periodsQuery.data ?? []).filter((p) => p.status !== 'PAID');

  const closeDialog = () => {
    setDialog(null);
    setReason('');
    setPeriodId('');
  };

  const handleApprove = useSingleFlight(async (deduction: PayrollDeduction) => {
    try {
      await approveMutation.mutateAsync(deduction.id);
      enqueueSnackbar('Descuento aprobado. Falta aplicarlo a un periodo.', {
        variant: 'success',
      });
    } catch (error: any) {
      enqueueSnackbar(
        error?.response?.data?.message ?? 'No se pudo aprobar el descuento',
        { variant: 'error' },
      );
    }
  });

  const handleConfirm = useSingleFlight(async () => {
    if (!dialog) return;
    try {
      if (dialog.kind === 'reject') {
        await rejectMutation.mutateAsync({
          id: dialog.deduction.id,
          rejectionReason: reason,
        });
        enqueueSnackbar(
          'Descuento rechazado. La orden queda con saldo pendiente por cobrar.',
          { variant: 'info' },
        );
      } else if (dialog.kind === 'cancel') {
        await cancelMutation.mutateAsync({
          id: dialog.deduction.id,
          cancelReason: reason,
        });
        enqueueSnackbar('Descuento cancelado', { variant: 'info' });
      } else {
        await applyMutation.mutateAsync({
          id: dialog.deduction.id,
          dto: {
            periodId,
            // Un doble clic manda la misma llave y el backend devuelve el
            // descuento ya aplicado en vez de descontar dos veces.
            idempotencyKey: `deduction-${dialog.deduction.id}-${periodId}`,
          },
        });
        enqueueSnackbar(
          'Descuento aplicado: se restó de la nómina y la orden quedó saldada.',
          { variant: 'success' },
        );
      }
      closeDialog();
    } catch (error: any) {
      enqueueSnackbar(
        error?.response?.data?.message ?? 'No se pudo completar la acción',
        { variant: 'error' },
      );
    }
  });

  const columns: GridColDef<PayrollDeduction>[] = [
    {
      field: 'orderNumber',
      headerName: 'Nº Orden',
      width: 120,
      valueGetter: (_v, row) => row.order.orderNumber,
    },
    {
      field: 'employee',
      headerName: 'Empleado',
      flex: 1,
      minWidth: 180,
      valueGetter: (_v, row) => employeeName(row),
    },
    {
      field: 'amount',
      headerName: 'Valor a descontar',
      width: 150,
      valueGetter: (_v, row) => formatCurrency(Number(row.amount)),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 190,
      renderCell: ({ row }) => {
        const info = PAYROLL_DEDUCTION_STATUS_LABELS[row.status as PayrollDeductionStatus];
        return <Chip size="small" label={info.label} color={info.color} />;
      },
    },
    {
      field: 'period',
      headerName: 'Periodo aplicado',
      width: 180,
      valueGetter: (_v, row) => row.payrollItem?.period.name ?? '—',
    },
    {
      field: 'createdAt',
      headerName: 'Solicitado',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.createdAt),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 170,
      sortable: false,
      renderCell: ({ row }) => {
        // Solo la fila que se tocó gira; las demás siguen usables. El resto de
        // acciones de *esta* fila se bloquean para que no se solapen.
        const approving = isRowPending(approveMutation, row.id);
        const rowBusy = isAnyRowPending(
          [approveMutation, rejectMutation, applyMutation, cancelMutation],
          row.id,
        );

        return (
        <Stack direction="row" spacing={0.5}>
          {canApprove && row.status === 'PENDING' && (
            <Tooltip title="Aprobar el descuento">
              <LoadingButton
                size="small"
                color="success"
                startIcon={<CheckCircleIcon />}
                loading={approving}
                disabled={rowBusy}
                onClick={() => handleApprove(row)}
              >
                Aprobar
              </LoadingButton>
            </Tooltip>
          )}
          {canApprove && row.status === 'PENDING' && (
            <Tooltip title="Rechazar: la orden se cobra por otro medio">
              <LoadingButton
                size="small"
                color="error"
                startIcon={<CancelIcon />}
                disabled={rowBusy}
                onClick={() => setDialog({ kind: 'reject', deduction: row })}
              >
                Rechazar
              </LoadingButton>
            </Tooltip>
          )}
          {canApply && row.status === 'APPROVED' && (
            <Tooltip title="Restar de la nómina y saldar la orden">
              <LoadingButton
                size="small"
                startIcon={<ApplyIcon />}
                disabled={rowBusy}
                onClick={() => setDialog({ kind: 'apply', deduction: row })}
              >
                Aplicar
              </LoadingButton>
            </Tooltip>
          )}
          {canApprove && ['APPROVED', 'APPLIED'].includes(row.status) && (
            <Tooltip title="Deshacer el descuento">
              <LoadingButton
                size="small"
                color="warning"
                startIcon={<UndoIcon />}
                disabled={rowBusy}
                onClick={() => setDialog({ kind: 'cancel', deduction: row })}
              >
                Cancelar
              </LoadingButton>
            </Tooltip>
          )}
        </Stack>
        );
      },
    },
  ];

  const dialogCopy = {
    reject: {
      title: 'Rechazar descuento',
      body: 'La orden queda con su saldo pendiente y habrá que cobrarla por otro medio.',
      label: 'Motivo del rechazo',
    },
    cancel: {
      title: 'Cancelar descuento',
      body: 'Si el descuento ya se aplicó, el valor se le devuelve al empleado en su nómina, se anula el abono y la orden vuelve a quedar debiendo.',
      label: 'Motivo de la cancelación',
    },
    apply: {
      title: 'Aplicar descuento sobre la nómina',
      body: 'Se restará el valor del pago del empleado en el periodo que elijas y la orden quedará saldada. No genera movimiento de caja.',
      label: '',
    },
  } as const;

  const canConfirm =
    dialog?.kind === 'apply' ? Boolean(periodId) : reason.trim().length >= 5;

  // El diálogo es uno solo para tres acciones distintas, así que el spinner
  // sale de la mutación que corresponda al tipo abierto.
  const confirming =
    dialog?.kind === 'reject'
      ? rejectMutation.isPending
      : dialog?.kind === 'cancel'
        ? cancelMutation.isPending
        : dialog?.kind === 'apply'
          ? applyMutation.isPending
          : false;

  return (
    <Box>
      <PageHeader
        title="Descuento de Órdenes"
        subtitle="Órdenes de empleados que se descuentan de su quincena en vez de cobrarse en caja"
      />

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Estado"
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              status: (e.target.value || undefined) as PayrollDeductionStatus | undefined,
              page: 1,
            }))
          }
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(PAYROLL_DEDUCTION_STATUS_LABELS).map(([value, info]) => (
            <MenuItem key={value} value={value}>
              {info.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataTable
        density="compact"
        rows={deductionsQuery.data?.data ?? []}
        columns={columns}
        loading={deductionsQuery.isLoading || deductionsQuery.isFetching}
        getRowId={(row) => row.id}
        pageSize={filters.limit ?? 25}
        pageSizeOptions={[25, 50, 100]}
        rowCount={deductionsQuery.data?.total ?? 0}
        currentPage={(filters.page ?? 1) - 1}
        onPaginationModelChange={(model) =>
          setFilters((prev) => ({
            ...prev,
            page: model.page + 1,
            limit: model.pageSize,
          }))
        }
        searchValue={filters.search ?? ''}
        onSearchChange={(value) =>
          setFilters((prev) => ({ ...prev, search: value, page: 1 }))
        }
        serverSideSearch
        searchPlaceholder="Buscar por número de orden o cliente..."
      />

      <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth>
        {dialog && (
          <>
            <DialogTitle>{dialogCopy[dialog.kind].title}</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                {dialogCopy[dialog.kind].body}
              </DialogContentText>

              <Typography variant="body2" sx={{ mb: 2 }}>
                Orden <strong>{dialog.deduction.order.orderNumber}</strong> ·{' '}
                {employeeName(dialog.deduction)} ·{' '}
                <strong>{formatCurrency(Number(dialog.deduction.amount))}</strong>
              </Typography>

              {dialog.kind === 'apply' ? (
                <TextField
                  select
                  fullWidth
                  label="Periodo de nómina"
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  helperText="Los periodos ya pagados no se pueden modificar: no aparecen acá."
                >
                  {openPeriods.map((period) => (
                    <MenuItem key={period.id} value={period.id}>
                      {period.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={dialogCopy[dialog.kind].label}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  helperText="Mínimo 5 caracteres. Queda en el historial del descuento."
                />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDialog} disabled={confirming}>
                Cerrar
              </Button>
              <LoadingButton
                variant="contained"
                loading={confirming}
                disabled={!canConfirm}
                onClick={() => handleConfirm()}
              >
                Confirmar
              </LoadingButton>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default PayrollDeductionsPage;
