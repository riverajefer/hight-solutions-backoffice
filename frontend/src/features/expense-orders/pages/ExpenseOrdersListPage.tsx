import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Stack,
  MenuItem,
  TextField,
  Button,
  Chip,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Add as AddIcon } from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { ActionsCell } from '../../../components/common/DataTable/ActionsCell';
import { useExpenseOrders } from '../hooks';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import {
  ExpenseOrderStatus,
  EXPENSE_ORDER_STATUS_CONFIG,
  type ExpenseOrder,
  type FilterExpenseOrdersDto,
} from '../../../types/expense-order.types';

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));

const formatCurrency = (value: string | number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
    Number(value),
  );

const STATUS_OPTIONS: { value: ExpenseOrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: ExpenseOrderStatus.DRAFT, label: 'Borrador' },
  { value: ExpenseOrderStatus.CREATED, label: 'Creada' },
  { value: ExpenseOrderStatus.AUTHORIZED, label: 'Autorizada' },
  { value: ExpenseOrderStatus.PAID, label: 'Pagada' },
];

export const ExpenseOrdersListPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [filters, setFilters] = useState<FilterExpenseOrdersDto>({ page: 1, limit: 20 });
  const [confirmDelete, setConfirmDelete] = useState<ExpenseOrder | null>(null);

  const { expenseOrdersQuery, deleteExpenseOrderMutation } = useExpenseOrders(filters);

  const canCreate = hasPermission(PERMISSIONS.CREATE_EXPENSE_ORDERS);
  const canUpdate = hasPermission(PERMISSIONS.UPDATE_EXPENSE_ORDERS);
  const canDelete = hasPermission(PERMISSIONS.DELETE_EXPENSE_ORDERS);

  const handleFilterChange = (key: keyof FilterExpenseOrdersDto, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const handleView = (og: ExpenseOrder) => {
    navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', og.id));
  };

  const handleEdit = (og: ExpenseOrder) => {
    navigate(ROUTES.EXPENSE_ORDERS_EDIT.replace(':id', og.id));
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteExpenseOrderMutation.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  const expenseOrders = expenseOrdersQuery.data?.data ?? [];
  const meta = expenseOrdersQuery.data?.meta;

  const columns: GridColDef<ExpenseOrder>[] = [
    {
      field: 'ogNumber',
      headerName: 'Nº OG',
      width: 140,
      renderCell: ({ row }) => (
        <Box
          sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => handleView(row)}
        >
          {row.ogNumber}
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 130,
      renderCell: ({ row }) => {
        const config = EXPENSE_ORDER_STATUS_CONFIG[row.status];
        return <Chip label={config.label} color={config.color} size="small" />;
      },
    },
    {
      field: 'expenseType',
      headerName: 'Tipo',
      width: 140,
      renderCell: ({ row }) => row.expenseType.name,
    },
    {
      field: 'expenseSubcategory',
      headerName: 'Subcategoría',
      width: 160,
      renderCell: ({ row }) => row.expenseSubcategory.name,
    },
    {
      field: 'authorizedTo',
      headerName: 'Autorizado a',
      flex: 1,
      renderCell: ({ row }) =>
        `${row.authorizedTo.firstName ?? ''} ${row.authorizedTo.lastName ?? ''}`.trim() ||
        row.authorizedTo.email,
    },
    {
      field: 'workOrder',
      headerName: 'OT',
      width: 130,
      renderCell: ({ row }) => row.workOrder?.workOrderNumber ?? '—',
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 130,
      renderCell: ({ row }) => {
        const total = row.items.reduce((acc, item) => acc + Number(item.total), 0);
        return formatCurrency(total);
      },
    },
    {
      field: 'createdAt',
      headerName: 'Fecha',
      width: 120,
      renderCell: ({ row }) => formatDate(row.createdAt),
    },
    {
      field: 'actions',
      headerName: '',
      width: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <ActionsCell
          onView={() => handleView(row)}
          onEdit={canUpdate && row.status === ExpenseOrderStatus.DRAFT ? () => handleEdit(row) : undefined}
          onDelete={
            canDelete && row.status === ExpenseOrderStatus.DRAFT
              ? () => setConfirmDelete(row)
              : undefined
          }
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Órdenes de Gastos"
        subtitle="Gestión de gastos de la empresa"
        action={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(ROUTES.EXPENSE_ORDERS_CREATE)}
            >
              Nueva OG
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField
          select
          label="Estado"
          size="small"
          value={filters.status ?? ''}
          onChange={(e) => handleFilterChange('status', e.target.value as ExpenseOrderStatus)}
          sx={{ minWidth: 150 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Buscar"
          size="small"
          placeholder="Nº OG o usuario..."
          value={filters.search ?? ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          sx={{ minWidth: 200 }}
        />
      </Stack>

      <DataTable
        columns={columns}
        rows={expenseOrders}
        loading={expenseOrdersQuery.isLoading}
        total={meta?.total ?? 0}
        page={(filters.page ?? 1) - 1}
        pageSize={filters.limit ?? 20}
        onPageChange={(page: number) => handleFilterChange('page', page + 1)}
        onPageSizeChange={(size: number) => handleFilterChange('limit', size)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Orden de Gasto"
        message={`¿Está seguro que desea eliminar la OG ${confirmDelete?.ogNumber}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleteExpenseOrderMutation.isPending}
      />
    </Box>
  );
};

export default ExpenseOrdersListPage;
