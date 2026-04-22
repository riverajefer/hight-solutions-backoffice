import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  MenuItem,
  TextField,
  Autocomplete,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Chip } from '@mui/material';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';
import {
  ShoppingCart as ShoppingCartIcon,
  SwapHoriz as SwapHorizIcon,
  WarningAmber as WarningAmberIcon,
  Today as TodayIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { ActionsCell } from '../../../components/common/DataTable/ActionsCell';
import { useOrders } from '../hooks';
import { useClients } from '../../clients/hooks/useClients';
import { useProductionAreas } from '../../production-areas/hooks/useProductionAreas';
import { useUsers } from '../../users/hooks/useUsers';
import { OrderStatusChip, ChangeStatusDialog } from '../components';
import { ROUTES } from '../../../utils/constants';
import type {
  Order,
  OrderStatus,
  FilterOrdersDto,
} from '../../../types/order.types';
import type { Client } from '../../../types/client.types';

// Estados que se consideran "finalizados" — no se alertan aunque la fecha esté vencida
const CLOSED_STATUSES: OrderStatus[] = [
  'DELIVERED',
  'DELIVERED_ON_CREDIT',
  'WARRANTY',
  'PAID',
  'ANULADO',
];

type DeliveryAlert = 'overdue' | 'due-today' | null;

function getDeliveryAlert(order: Order): DeliveryAlert {
  if (!order.deliveryDate) return null;
  if (CLOSED_STATUSES.includes(order.status)) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const delivery = new Date(order.deliveryDate);
  delivery.setHours(0, 0, 0, 0);

  if (delivery < today) return 'overdue';
  if (delivery.getTime() === today.getTime()) return 'due-today';
  return null;
}

const formatCurrency = (value: string): string => {
  const numValue = parseFloat(value);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
};

const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO').format(new Date(date));
};

const formatDateTime = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const getDaysSince = (date: string): number => {
  const created = new Date(date);
  created.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'IN_PRODUCTION', label: 'En Producción' },
  { value: 'READY', label: 'Lista para entrega' },
  { value: 'DELIVERED', label: 'Entregada' },
  { value: 'DELIVERED_ON_CREDIT', label: 'Entregado a Crédito' },
  { value: 'WARRANTY', label: 'Garantía' },
  { value: 'PAID', label: 'Pagada' },
  { value: 'ANULADO', label: 'Anulada' },
];

export const OrdersListPage: React.FC = () => {
  const navigate = useNavigate();

  // Filtros
  const [filters, setFilters] = useState<FilterOrdersDto>({
    page: 1,
    limit: 20,
  });

  // UI state
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null);
  const [changeStatusOrder, setChangeStatusOrder] = useState<Order | null>(
    null,
  );

  // Queries
  const { ordersQuery, deleteOrderMutation, updateStatusMutation } =
    useOrders(filters);
  const { clientsQuery } = useClients({ includeInactive: false });
  const { productionAreasQuery } = useProductionAreas();
  const { usersQuery } = useUsers();

  const orders = ordersQuery.data?.data || [];
  const clients = clientsQuery.data || [];
  const productionAreas = productionAreasQuery.data || [];
  const users = usersQuery.data || [];

  const selectedClient = filters.clientId
    ? clients.find((c) => c.id === filters.clientId)
    : null;
    
  const selectedArea = filters.productionAreaId
    ? productionAreas.find((a: any) => a.id === filters.productionAreaId)
    : null;

  const selectedUser = filters.createdById
    ? users.find((u: any) => u.id === filters.createdById)
    : null;

  // Handlers
  const handleFilterChange = (key: keyof FilterOrdersDto, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset page when filters change
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
    });
  };

  const handleViewOrder = (order: Order) => {
    navigate(`/orders/${order.id}`);
  };

  const handleEditOrder = (order: Order) => {
    navigate(`/orders/${order.id}/edit`);
  };

  const handleDeleteOrder = async () => {
    if (!confirmDelete) return;

    try {
      await deleteOrderMutation.mutateAsync(confirmDelete.id);
      setConfirmDelete(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleChangeStatus = async (newStatus: OrderStatus) => {
    if (!changeStatusOrder) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: changeStatusOrder.id,
        status: newStatus,
      });
    } catch (error) {
      // Relanzar el error para que el componente ChangeStatusDialog lo maneje
      // Especialmente importante para errores 403 que requieren autorización
      throw error;
    }
  };

  // Columns definition with responsive breakpoints
  const rawColumns: ResponsiveGridColDef[] = useMemo(() => [
    {
      field: 'orderNumber',
      headerName: 'Nº Orden',
      width: 130,
      minWidth: 100,
      resizable: false,
      headerClassName: 'sticky-column-order-number',
      cellClassName: 'sticky-column-order-number',
      renderCell: (params: any) => (
        <Box sx={{ fontWeight: 600, color: 'primary.main' }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 140,
      renderCell: (params: any) => <OrderStatusChip status={params.value} />,
    },
    {
      field: 'client',
      headerName: 'Cliente',
      flex: 1,
      minWidth: 150,
      valueGetter: (_: any, row: any) => row.client.name,
    },
    {
      field: 'workOrders',
      headerName: 'OT',
      width: 140,
      sortable: false,
      filterable: false,
      responsive: 'md',
      renderCell: (params: any) => {
        const workOrder = params.row.workOrders?.[0];
        if (!workOrder)
          return (
            <Box sx={{ color: 'text.disabled', fontSize: '0.8rem' }}>—</Box>
          );
        return (
          <Tooltip title='Ver Orden de Trabajo'>
            <Chip
              icon={<BuildIcon sx={{ fontSize: '0.85rem !important' }} />}
              label={workOrder.workOrderNumber}
              size='small'
              variant='outlined'
              color='primary'
              onClick={(e: any) => {
                e.stopPropagation();
                navigate(
                  ROUTES.WORK_ORDERS_DETAIL.replace(':id', workOrder.id),
                );
              }}
              sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
            />
          </Tooltip>
        );
      },
    },
    {
      field: 'orderDate',
      headerName: 'Fecha Orden',
      width: 150,
      responsive: 'md',
      renderCell: (params: any) => formatDateTime(params.value),
    },
    {
      field: 'deliveryDate',
      headerName: 'F. Entrega',
      width: 140,
      responsive: 'sm',
      renderCell: (params: any) => {
        if (!params.value) return '-';

        const alert = getDeliveryAlert(params.row);
        const dateStr = formatDate(params.value);

        if (alert === 'overdue') {
          return (
            <Tooltip title='Retraso en la entrega o el cliente no ha recogido el producto'>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: 'error.main',
                  fontWeight: 600,
                }}
              >
                <WarningAmberIcon fontSize='small' />
                <span>{dateStr}</span>
              </Box>
            </Tooltip>
          );
        }

        if (alert === 'due-today') {
          return (
            <Tooltip title='Se entrega hoy'>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: 'info.main',
                  fontWeight: 600,
                }}
              >
                <TodayIcon fontSize='small' />
                <span>{dateStr}</span>
              </Box>
            </Tooltip>
          );
        }

        return dateStr;
      },
    },
    {
      field: 'daysSinceCreation',
      headerName: 'Días',
      width: 90,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      responsive: 'lg',
      valueGetter: (_: any, row: any) => getDaysSince(row.createdAt),
      renderCell: (params: any) => {
        const days = params.value as number;
        if (days === 0) return 'Hoy';
        if (days === 1) return '1 día';
        return `${days} días`;
      },
    },
    {
      field: 'createdBy',
      headerName: 'Asesor',
      width: 140,
      responsive: 'lg',
      valueGetter: (_: any, row: any) =>
        row.createdBy?.firstName + ' ' + row.createdBy?.lastName,
    },
    {
      field: 'productionAreas',
      headerName: 'Áreas',
      width: 150,
      responsive: 'md',
      sortable: false,
      renderCell: (params: any) => {
        const areas = new Set<string>();
        params.row.items?.forEach((item: any) => {
          item.productionAreas?.forEach((pa: any) => {
            if (pa.productionArea?.name) {
              areas.add(pa.productionArea.name);
            }
          });
        });
        
        if (areas.size === 0) return <span style={{ color: '#aaa' }}>-</span>;
        
        const areasList = Array.from(areas);
        return (
          <Tooltip title={areasList.join(', ')}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxHeight: '100%', overflow: 'hidden' }}>
              {areasList.slice(0, 2).map((area, idx) => (
                <Chip key={idx} label={area} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
              ))}
              {areasList.length > 2 && (
                <Chip label={`+${areasList.length - 2}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
              )}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'taxRate',
      headerName: 'IVA',
      width: 70,
      align: 'center',
      headerAlign: 'center',
      responsive: 'lg',
      renderCell: (params: any) => {
        const hasIva = parseFloat(params.value) > 0;
        return (
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 1,
              color: hasIva ? 'success.dark' : 'text.secondary',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            {hasIva ? 'SÍ' : 'NO'}
          </Box>
        );
      },
    },
    {
      field: 'requiresColorProof',
      headerName: 'P. Color',
      width: 100,
      responsive: 'lg',
      renderCell: (params: any) => (
        <Box
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 1,
            color: params.value ? 'success.dark' : 'text.secondary',
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        >
          {params.value ? 'Sí' : 'No'}
        </Box>
      ),
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params: any) => formatCurrency(params.value),
    },
    {
      field: 'balance',
      headerName: 'Saldo',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      responsive: 'md',
      renderCell: (params: any) => {
        const balance = parseFloat(params.value);
        return (
          <Box
            sx={{
              color: balance > 0 ? 'warning.main' : 'success.main',
              fontWeight: 500,
            }}
          >
            {formatCurrency(params.value)}
          </Box>
        );
      },
    },
    {
      field: 'advancePaymentStatus',
      headerName: 'Anticipo',
      width: 120,
      responsive: 'md',
      renderCell: (params: any) => {
        const status = params.value;
        if (!status) return <Box sx={{ color: 'text.disabled', fontSize: '0.8rem' }}>—</Box>;
        const config: Record<string, { label: string; color: 'warning' | 'success' | 'error' }> = {
          PENDING: { label: 'Pendiente', color: 'warning' },
          APPROVED: { label: 'Aprobado', color: 'success' },
          REJECTED: { label: 'Rechazado', color: 'error' },
        };
        const c = config[status];
        return c ? <Chip label={c.label} color={c.color} size='small' /> : <>{status}</>;
      },
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 160,
      sortable: false,
      renderCell: (params: any) => {
        const canEdit = !['DELIVERED'].includes(params.row.status);
        const canDelete = ['DRAFT'].includes(params.row.status);

        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <ActionsCell
              onView={() => handleViewOrder(params.row)}
              onEdit={canEdit ? () => handleEditOrder(params.row) : undefined}
              onDelete={
                canDelete ? () => setConfirmDelete(params.row) : undefined
              }
            />
            <Tooltip title='Cambiar estado'>
              <IconButton
                size='small'
                color='primary'
                onClick={(e: any) => {
                  e.stopPropagation();
                  setChangeStatusOrder(params.row);
                }}
              >
                <SwapHorizIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ], [navigate]);

  const columns = useResponsiveColumns(rawColumns);

  const hasActiveFilters =
    filters.status ||
    filters.clientId ||
    filters.orderDateFrom ||
    filters.orderDateTo ||
    filters.search ||
    filters.productionAreaId ||
    filters.createdById;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title='Órdenes de Pedido'
        breadcrumbs={[{ label: 'Órdenes' }]}
        action={
          <Button
            variant='outlined'
            startIcon={<ShoppingCartIcon />}
            onClick={() => navigate('/orders/new')}
          >
            Nueva Orden
          </Button>
        }
      />

      {/* Filtros */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: 'repeat(3, 1fr)',
            lg: '1fr 1fr 1fr 1.5fr 1fr 1fr auto',
          },
          gap: 2,
          mb: 3,
          mt: 2,
        }}
      >
        {/* Estado */}
        <TextField
          select
          label='Estado'
          value={filters.status || ''}
          onChange={(e) =>
            handleFilterChange('status', e.target.value || undefined)
          }
          fullWidth
          size='small'
        >
          <MenuItem value=''>Todos los estados</MenuItem>
          {ORDER_STATUS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Área de producción */}
        <Autocomplete
          fullWidth
          size='small'
          options={productionAreas}
          value={selectedArea}
          onChange={(_, newValue) =>
            handleFilterChange('productionAreaId', newValue?.id)
          }
          getOptionLabel={(option: any) => option.name}
          renderInput={(params) => (
            <TextField
              {...params}
              label='Área Producción'
              placeholder='Todas las áreas'
            />
          )}
          loading={productionAreasQuery.isLoading}
        />

        {/* Asesor */}
        <Autocomplete
          fullWidth
          size='small'
          options={users}
          value={selectedUser}
          onChange={(_, newValue) =>
            handleFilterChange('createdById', newValue?.id)
          }
          getOptionLabel={(option: any) => `${option.firstName} ${option.lastName}`}
          renderInput={(params) => (
            <TextField
              {...params}
              label='Asesor'
              placeholder='Todos los asesores'
            />
          )}
          loading={usersQuery.isLoading}
        />

        {/* Cliente */}
        <Autocomplete
          fullWidth
          size='small'
          options={clients}
          value={selectedClient}
          onChange={(_, newValue) =>
            handleFilterChange('clientId', newValue?.id)
          }
          getOptionLabel={(option: Client) => option.name}
          renderInput={(params) => (
            <TextField
              {...params}
              label='Cliente'
              placeholder='Todos los clientes'
            />
          )}
          loading={clientsQuery.isLoading}
        />

        {/* Fecha Desde */}
        <DatePicker
          label='Fecha Desde'
          value={filters.orderDateFrom ? new Date(filters.orderDateFrom) : null}
          onChange={(date) =>
            handleFilterChange('orderDateFrom', date?.toISOString())
          }
          slotProps={{
            textField: { size: 'small', fullWidth: true },
          }}
        />

        {/* Fecha Hasta */}
        <DatePicker
          label='Fecha Hasta'
          value={filters.orderDateTo ? new Date(filters.orderDateTo) : null}
          onChange={(date) =>
            handleFilterChange('orderDateTo', date?.toISOString())
          }
          slotProps={{
            textField: { size: 'small', fullWidth: true },
          }}
        />

        {/* Limpiar Filtros */}
        {hasActiveFilters && (
          <Button
            variant='outlined'
            onClick={handleClearFilters}
            size='large'
            sx={{ height: 40 }}
          >
            Limpiar Filtros
          </Button>
        )}
      </Box>

      {/* Tabla */}
      <DataTable
        density='compact'
        rows={orders}
        columns={columns}
        loading={ordersQuery.isLoading}
        getRowId={(row) => row.id}
        onRowClick={handleViewOrder}
        pageSize={filters.limit}
        searchValue={filters.search || ''}
        onSearchChange={(value) => handleFilterChange('search', value)}
        serverSideSearch={true}
        searchPlaceholder='Buscar por número, cliente, notas...'
        emptyMessage='No se encontraron órdenes'
        getRowClassName={(params) => {
          if (params.row.status === 'ANULADO') return 'row-anulado';
          // Anticipo pendiente/rechazado tiene prioridad visual
          if (params.row.advancePaymentStatus === 'PENDING') return 'row-advance-pending';
          if (params.row.advancePaymentStatus === 'REJECTED') return 'row-advance-rejected';
          const alert = getDeliveryAlert(params.row);
          if (alert === 'overdue') return 'row-overdue';
          if (alert === 'due-today') return 'row-due-today';
          return '';
        }}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        title='Eliminar Orden'
        message={`¿Está seguro que desea eliminar la orden ${confirmDelete?.orderNumber}? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteOrder}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteOrderMutation.isPending}
      />

      {/* Change Status Dialog */}
      <ChangeStatusDialog
        open={!!changeStatusOrder}
        order={changeStatusOrder}
        onClose={() => setChangeStatusOrder(null)}
        onConfirm={handleChangeStatus}
        isLoading={updateStatusMutation.isPending}
      />
    </Box>
  );
};

export default OrdersListPage;
