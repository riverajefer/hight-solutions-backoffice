import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Stack,
  MenuItem,
  TextField,
  Autocomplete,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import {
  ShoppingCart as ShoppingCartIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { ActionsCell } from '../../../components/common/DataTable/ActionsCell';
import { useOrders } from '../hooks';
import { useClients } from '../../clients/hooks/useClients';
import { OrderStatusChip, ChangeStatusDialog } from '../components';
import type { Order, OrderStatus, FilterOrdersDto } from '../../../types/order.types';
import type { Client } from '../../../types/client.types';

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

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'IN_PRODUCTION', label: 'En Producción' },
  { value: 'READY', label: 'Lista para entrega' },
  { value: 'DELIVERED', label: 'Entregada' },
  { value: 'WARRANTY', label: 'Garantía' },
  { value: 'RETURNED', label: 'Devolución' },
  { value: 'PAID', label: 'Pagada' },
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
  const [changeStatusOrder, setChangeStatusOrder] = useState<Order | null>(null);

  // Queries
  const { ordersQuery, deleteOrderMutation, updateStatusMutation } = useOrders(filters);
  const { clientsQuery } = useClients({ includeInactive: false });

  const orders = ordersQuery.data?.data || [];
  const clients = clientsQuery.data || [];
  const selectedClient = filters.clientId
    ? clients.find((c) => c.id === filters.clientId)
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
      // Error is handled by the mutation
    }
  };

  // Columns definition
  const columns: GridColDef<Order>[] = [
    {
      field: 'orderNumber',
      headerName: 'Nº Orden',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ fontWeight: 600, color: 'primary.main' }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'client',
      headerName: 'Cliente',
      width: 250,
      valueGetter: (_, row) => row.client.name,
    },
    {
      field: 'orderDate',
      headerName: 'Fecha Orden',
      width: 130,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: 'deliveryDate',
      headerName: 'Fecha Entrega',
      width: 130,
      renderCell: (params) =>
        params.value ? formatDate(params.value) : '-',
    },
    // creado por
    {
      field: 'createdBy',
      headerName: 'Creado por',
      width: 150,
      valueGetter: (_, row) => row.createdBy?.firstName + ' ' + row.createdBy?.lastName,
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'balance',
      headerName: 'Saldo',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => {
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
      field: 'status',
      headerName: 'Estado',
      width: 150,
      renderCell: (params) => <OrderStatusChip status={params.value} />,
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 200,
      sortable: false,
      renderCell: (params) => {
        const canEdit = !['DELIVERED'].includes(params.row.status);
        const canDelete = ['DRAFT'].includes(params.row.status);

        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <ActionsCell
              onView={() => handleViewOrder(params.row)}
              onEdit={canEdit ? () => handleEditOrder(params.row) : undefined}
              onDelete={canDelete ? () => setConfirmDelete(params.row) : undefined}
            />
            {/* Botón para cambiar estado */}
            <Tooltip title="Cambiar estado">
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setChangeStatusOrder(params.row);
                }}
              >
                <SwapHorizIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  const hasActiveFilters =
    filters.status || filters.clientId || filters.orderDateFrom || filters.orderDateTo;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Órdenes de Pedido"
        breadcrumbs={[{ label: 'Órdenes' }]}
        action={
          <Button
            variant="outlined"
            startIcon={<ShoppingCartIcon />}
            onClick={() => navigate('/orders/new')}
          >
            Nueva Orden
          </Button>
        }
      />

      {/* Filtros */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, mt: 2 }}
      >
        {/* Estado */}
        <TextField
          select
          label="Estado"
          value={filters.status || ''}
          onChange={(e) =>
            handleFilterChange('status', e.target.value || undefined)
          }
          sx={{ minWidth: 200 }}
          size="small"
        >
          <MenuItem value="">Todos los estados</MenuItem>
          {ORDER_STATUS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Cliente */}
        <Autocomplete
          sx={{ minWidth: 300 }}
          size="small"
          options={clients}
          value={selectedClient}
          onChange={(_, newValue) =>
            handleFilterChange('clientId', newValue?.id)
          }
          getOptionLabel={(option: Client) => option.name}
          renderInput={(params) => (
            <TextField {...params} label="Cliente" placeholder="Todos los clientes" />
          )}
          loading={clientsQuery.isLoading}
        />

        {/* Fecha Desde */}
        <DatePicker
          label="Fecha Desde"
          value={filters.orderDateFrom ? new Date(filters.orderDateFrom) : null}
          onChange={(date) =>
            handleFilterChange('orderDateFrom', date?.toISOString())
          }
          slotProps={{
            textField: { size: 'small', sx: { minWidth: 180 } },
          }}
        />

        {/* Fecha Hasta */}
        <DatePicker
          label="Fecha Hasta"
          value={filters.orderDateTo ? new Date(filters.orderDateTo) : null}
          onChange={(date) =>
            handleFilterChange('orderDateTo', date?.toISOString())
          }
          slotProps={{
            textField: { size: 'small', sx: { minWidth: 180 } },
          }}
        />

        {/* Limpiar Filtros */}
        {hasActiveFilters && (
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            size="small"
            sx={{ minWidth: 120 }}
          >
            Limpiar Filtros
          </Button>
        )}
      </Stack>

      {/* Tabla */}
      <DataTable
        rows={orders}
        columns={columns}
        loading={ordersQuery.isLoading}
        getRowId={(row) => row.id}
        onRowClick={handleViewOrder}
        pageSize={filters.limit}
        emptyMessage="No se encontraron órdenes"
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Orden"
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
