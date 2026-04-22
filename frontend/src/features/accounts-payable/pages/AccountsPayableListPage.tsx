import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { Add as AddIcon } from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { ActionsCell } from '../../../components/common/DataTable/ActionsCell';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { AccountPayable, FilterAccountPayableDto } from '../../../types/accounts-payable.types';
import {
  AccountPayableStatus,
  ACCOUNT_PAYABLE_STATUS_CONFIG,
} from '../../../types/accounts-payable.types';
import { useExpenseTypes } from '../../expense-orders/hooks/useExpenseOrders';
import { AccountPayableStatusChip } from '../components/AccountPayableStatusChip';
import { AccountPayableSummaryCards } from '../components/AccountPayableSummaryCards';
import { useAccountsPayable } from '../hooks/useAccountsPayable';

const isDueDateWarning = (dueDate: string, status: AccountPayableStatus): string | null => {
  if (status === AccountPayableStatus.PAID || status === AccountPayableStatus.CANCELLED) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0) return 'overdue';
  if (diffDays <= 7) return 'upcoming';
  return null;
};

export default function AccountsPayableListPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [filters, setFilters] = useState<FilterAccountPayableDto>({ page: 1, limit: 20 });
  const [confirmCancel, setConfirmCancel] = useState<AccountPayable | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { query, cancelMutation } = useAccountsPayable(filters);

  const { data: expenseTypes = [] } = useExpenseTypes();

  const canCreate = hasPermission(PERMISSIONS.CREATE_ACCOUNTS_PAYABLE);
  const canUpdate = hasPermission(PERMISSIONS.UPDATE_ACCOUNTS_PAYABLE);
  const canDelete = hasPermission(PERMISSIONS.DELETE_ACCOUNTS_PAYABLE);

  const handleView = (ap: AccountPayable) => {
    navigate(ROUTES.ACCOUNTS_PAYABLE_DETAIL.replace(':id', ap.id));
  };

  const handleEdit = (ap: AccountPayable) => {
    navigate(ROUTES.ACCOUNTS_PAYABLE_EDIT.replace(':id', ap.id));
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancel || !cancelReason.trim()) return;
    await cancelMutation.mutateAsync({ id: confirmCancel.id, dto: { cancelReason } });
    setConfirmCancel(null);
    setCancelReason('');
  };

  const accounts = query.data?.data ?? [];

  const rawColumns: ResponsiveGridColDef<AccountPayable>[] = useMemo(
    () => [
      {
        field: 'apNumber',
        headerName: 'Nº CP',
        width: 140,
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) => (
          <Box
            sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => handleView(row)}
          >
            {row.apNumber}
          </Box>
        ),
      },
      {
        field: 'description',
        headerName: 'Descripción',
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) => {
          const itemNames = row.expenseOrder?.items?.map((i) => i.name).join(', ');
          const display = itemNames ? `${row.description} — ${itemNames}` : row.description;
          const tooltip = itemNames ? `${row.description}\nÍtems: ${itemNames}` : row.description;
          return (
            <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>}>
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                {display}
              </Box>
            </Tooltip>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 120,
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) => (
          <AccountPayableStatusChip status={row.status} />
        ),
      },
      {
        field: 'supplier',
        headerName: 'Proveedor',
        width: 160,
        responsive: 'md',
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) => row.supplier?.name ?? '—',
      },
      {
        field: 'expenseType',
        headerName: 'Tipo de Gasto',
        width: 140,
        responsive: 'sm',
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) =>
          row.expenseType?.name ?? '—',
      },
      {
        field: 'expenseSubcategory',
        headerName: 'Subcategoría',
        width: 140,
        responsive: 'sm',
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) =>
          row.expenseSubcategory?.name ?? '—',
      },
      {
        field: 'totalAmount',
        headerName: 'Total',
        width: 130,
        responsive: 'sm',
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) =>
          formatCurrency(row.totalAmount),
      },
      {
        field: 'paidAmount',
        headerName: 'Abonado',
        width: 130,
        responsive: 'md',
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) =>
          formatCurrency(row.paidAmount),
      },
      {
        field: 'balance',
        headerName: 'Saldo',
        width: 130,
        responsive: 'sm',
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) =>
          formatCurrency(row.balance),
      },
      {
        field: 'dueDate',
        headerName: 'Vencimiento',
        width: 140,
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) => {
          const warning = isDueDateWarning(row.dueDate, row.status);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {warning === 'overdue' && '🔴'}
              {warning === 'upcoming' && '🟡'}
              {formatDate(row.dueDate)}
            </Box>
          );
        },
      },
      {
        field: 'createdAt',
        headerName: 'Creado',
        width: 120,
        responsive: 'lg',
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) =>
          formatDate(row.createdAt),
      },
      {
        field: 'createdBy',
        headerName: 'Creado por',
        width: 150,
        responsive: 'lg',
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) => {
          const { firstName, lastName, email } = row.createdBy;
          return [firstName, lastName].filter(Boolean).join(' ') || email || '—';
        },
      },
      {
        field: 'actions',
        headerName: '',
        width: 120,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<AccountPayable>) => (
          <ActionsCell
            onView={() => handleView(row)}
            onEdit={
              canUpdate &&
              row.status !== AccountPayableStatus.PAID &&
              row.status !== AccountPayableStatus.CANCELLED
                ? () => handleEdit(row)
                : undefined
            }
            onDelete={
              canDelete &&
              row.status !== AccountPayableStatus.PAID &&
              row.status !== AccountPayableStatus.CANCELLED
                ? () => setConfirmCancel(row)
                : undefined
            }
          />
        ),
      },
    ],
    [canUpdate, canDelete],
  );

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title="Cuentas por Pagar"
        subtitle="Gestión de obligaciones financieras de la empresa"
        action={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(ROUTES.ACCOUNTS_PAYABLE_NEW)}
            >
              Nueva Cuenta
            </Button>
          ) : null
        }
      />

      <AccountPayableSummaryCards />

      {/* Filtros */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Buscar por descripción"
              size="small"
              fullWidth
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value || undefined, page: 1 }))
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                label="Estado"
                value={filters.status ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: (e.target.value as AccountPayableStatus) || undefined,
                    page: 1,
                  }))
                }
              >
                <MenuItem value="">Todos</MenuItem>
                {Object.values(AccountPayableStatus).map((s) => (
                  <MenuItem key={s} value={s}>
                    {ACCOUNT_PAYABLE_STATUS_CONFIG[s].label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Gasto</InputLabel>
              <Select
                label="Tipo de Gasto"
                value={filters.expenseTypeId ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    expenseTypeId: e.target.value || undefined,
                    page: 1,
                  }))
                }
              >
                <MenuItem value="">Todos</MenuItem>
                {expenseTypes.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <DatePicker
              label="Vence desde"
              value={filters.dueDateFrom ? new Date(filters.dueDateFrom) : null}
              onChange={(date) =>
                setFilters((prev) => ({
                  ...prev,
                  dueDateFrom: date ? date.toISOString().split('T')[0] : undefined,
                  page: 1,
                }))
              }
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <DatePicker
              label="Vence hasta"
              value={filters.dueDateTo ? new Date(filters.dueDateTo) : null}
              onChange={(date) =>
                setFilters((prev) => ({
                  ...prev,
                  dueDateTo: date ? date.toISOString().split('T')[0] : undefined,
                  page: 1,
                }))
              }
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              sx={{ height: 40 }}
              onClick={() => setFilters({ page: 1, limit: 20 })}
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Box>

      <DataTable
        rows={accounts}
        columns={columns}
        loading={query.isLoading}
        pageSize={filters.limit ?? 20}
        emptyMessage="No hay cuentas por pagar registradas"
        onRowClick={(row) => handleView(row as AccountPayable)}
      />

      <Dialog
        open={!!confirmCancel}
        onClose={() => {
          setConfirmCancel(null);
          setCancelReason('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Anular Cuenta por Pagar</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              ¿Estás seguro de que deseas anular la cuenta{' '}
              <strong>{confirmCancel?.apNumber}</strong>?
            </Box>
            <TextField
              label="Razón de la anulación *"
              multiline
              rows={2}
              fullWidth
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setConfirmCancel(null);
              setCancelReason('');
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!cancelReason.trim() || cancelMutation.isPending}
            onClick={handleConfirmCancel}
          >
            Anular
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
