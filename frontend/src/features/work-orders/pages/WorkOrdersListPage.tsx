import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Stack,
  MenuItem,
  TextField,
  Button,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Add as AddIcon } from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { ActionsCell } from '../../../components/common/DataTable/ActionsCell';
import { useWorkOrders } from '../hooks';
import { WorkOrderStatusChip } from '../components';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { WorkOrderStatus } from '../../../types/work-order.types';
import type { WorkOrder, FilterWorkOrdersDto } from '../../../types/work-order.types';

const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const STATUS_OPTIONS: { value: WorkOrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: WorkOrderStatus.DRAFT, label: 'Borrador' },
  { value: WorkOrderStatus.CONFIRMED, label: 'Confirmada' },
  { value: WorkOrderStatus.IN_PRODUCTION, label: 'En Producción' },
  { value: WorkOrderStatus.COMPLETED, label: 'Completada' },
  { value: WorkOrderStatus.CANCELLED, label: 'Cancelada' },
];

export const WorkOrdersListPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [filters, setFilters] = useState<FilterWorkOrdersDto>({
    page: 1,
    limit: 20,
  });

  const [confirmDelete, setConfirmDelete] = useState<WorkOrder | null>(null);

  const { workOrdersQuery, deleteWorkOrderMutation } = useWorkOrders(filters);

  const canCreate = hasPermission(PERMISSIONS.CREATE_WORK_ORDERS);
  const canUpdate = hasPermission(PERMISSIONS.UPDATE_WORK_ORDERS);
  const canDelete = hasPermission(PERMISSIONS.DELETE_WORK_ORDERS);

  const handleFilterChange = (key: keyof FilterWorkOrdersDto, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const handleView = (workOrder: WorkOrder) => {
    navigate(ROUTES.WORK_ORDERS_DETAIL.replace(':id', workOrder.id));
  };

  const handleEdit = (workOrder: WorkOrder) => {
    navigate(ROUTES.WORK_ORDERS_EDIT.replace(':id', workOrder.id));
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteWorkOrderMutation.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  const workOrders = workOrdersQuery.data?.data ?? [];

  const columns: GridColDef<WorkOrder>[] = [
    {
      field: 'workOrderNumber',
      headerName: 'Nº OT',
      width: 150,
    },
    {
      field: 'orderNumber',
      headerName: 'Nº Orden',
      width: 150,
      valueGetter: (_, row) => row.order?.orderNumber ?? '-',
    },
    {
      field: 'client',
      headerName: 'Cliente',
      width: 220,
      valueGetter: (_, row) => row.order?.client?.name ?? '-',
    },
    {
      field: 'advisor',
      headerName: 'Asesor',
      width: 180,
      valueGetter: (_, row) => {
        const a = row.advisor;
        if (!a) return '-';
        return `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || a.email;
      },
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 160,
      renderCell: (params) => <WorkOrderStatusChip status={params.value} />,
    },
    {
      field: 'createdAt',
      headerName: 'Creada',
      width: 170,
      valueGetter: (_, row) => (row.createdAt ? formatDate(row.createdAt) : '-'),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 160,
      sortable: false,
      renderCell: (params) => (
        <ActionsCell
          onView={() => handleView(params.row)}
          onEdit={
            canUpdate && ['DRAFT', 'CONFIRMED'].includes(params.row.status)
              ? () => handleEdit(params.row)
              : undefined
          }
          onDelete={
            canDelete && params.row.status === 'DRAFT'
              ? () => setConfirmDelete(params.row)
              : undefined
          }
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Órdenes de Trabajo"
        subtitle="Gestión de órdenes de trabajo para producción"
        action={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(ROUTES.WORK_ORDERS_CREATE)}
            >
              Nueva OT
            </Button>
          ) : undefined
        }
      />

      {/* Filtros */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField
          select
          label="Estado"
          value={filters.status ?? ''}
          onChange={(e) => handleFilterChange('status', e.target.value as WorkOrderStatus)}
          size="small"
          sx={{ minWidth: 160 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataTable
        rows={workOrders}
        columns={columns}
        loading={workOrdersQuery.isLoading}
        pageSize={filters.limit ?? 20}
        searchValue={filters.search ?? ''}
        onSearchChange={(value) => handleFilterChange('search', value)}
        serverSideSearch
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Orden de Trabajo"
        message={`¿Estás seguro de que deseas eliminar la OT ${confirmDelete?.workOrderNumber}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteWorkOrderMutation.isPending}
      />
    </Box>
  );
};

export default WorkOrdersListPage;
