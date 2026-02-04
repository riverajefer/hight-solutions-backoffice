import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, useTheme, alpha } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import PaymentsIcon from '@mui/icons-material/Payments';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { useOrders } from '../hooks';
import { OrderStatusChip } from '../components';
import type { Order } from '../../../types/order.types';
import { neonColors } from '../../../theme';

// ============================================================
// UTILIDADES
// ============================================================

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

// ============================================================
// CONSTANTES
// ============================================================

/** Estados que califica como "pendientes de pago" */
const PENDING_PAYMENT_STATUSES: string[] = [
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY',
  'DELIVERED',
];

// ============================================================
// COMPONENTE
// ============================================================

export const PendingPaymentOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Obtener todas las órdenes sin filtro de status (limit alto para cubrir
  // todas las pendientes). El filtro se aplica client-side.
  const { ordersQuery } = useOrders({ limit: 200 });

  // Filtro client-side: status activo + balance > 0
  const pendingOrders: Order[] = useMemo(() => {
    const allOrders = ordersQuery.data?.data || [];
    return allOrders.filter(
      (order) =>
        PENDING_PAYMENT_STATUSES.includes(order.status) &&
        parseFloat(order.balance) > 0,
    );
  }, [ordersQuery.data]);

  // Total pendiente por cobrar (suma de balances)
  const totalPendiente: number = useMemo(() => {
    return pendingOrders.reduce(
      (sum, order) => sum + parseFloat(order.balance),
      0,
    );
  }, [pendingOrders]);

  // Clic en fila → detalle de la orden existente
  const handleRowClick = (order: Order) => {
    navigate(`/orders/${order.id}`);
  };

  // ============================================================
  // COLUMNAS — mismo conjunto que OrdersListPage sin "Acciones"
  // ============================================================

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
    {
      field: 'createdBy',
      headerName: 'Creado por',
      width: 150,
      valueGetter: (_, row) =>
        row.createdBy?.firstName + ' ' + row.createdBy?.lastName,
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
      headerName: 'Monto Pendiente',
      width: 170,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Box sx={{ color: 'warning.main', fontWeight: 600 }}>
          {formatCurrency(params.value)}
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 150,
      renderCell: (params) => <OrderStatusChip status={params.value} />,
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Box sx={{ p: 3 }}>
      {/* Header sin botón de acción — vista de solo lectura */}
      <PageHeader
        title="Órdenes Pendientes de Pago"
        breadcrumbs={[
          { label: 'Órdenes', path: '/orders' },
          { label: 'Pendientes de Pago' },
        ]}
      />

      {/* ── Summary card: Total Pendiente por Cobrar ── */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          mt: 2,
          p: 2.5,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: isDark
            ? `linear-gradient(135deg, rgba(26, 26, 46, 0.9) 0%, rgba(22, 33, 62, 0.8) 100%)`
            : `linear-gradient(135deg, rgba(255, 255, 255, 0.97) 0%, rgba(249, 115, 22, 0.05) 100%)`,
          border: `1px solid ${
            isDark
              ? alpha(neonColors.primary.main, 0.2)
              : alpha('#F97316', 0.2)
          }`,
          boxShadow: isDark
            ? `0 4px 20px ${alpha(neonColors.primary.main, 0.12)}`
            : '0 4px 12px rgba(0, 0, 0, 0.07)',
        }}
      >
        {/* Icono */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '10px',
            background: isDark
              ? alpha('#F97316', 0.15)
              : alpha('#F97316', 0.1),
            flexShrink: 0,
          }}
        >
          <PaymentsIcon sx={{ fontSize: 28, color: '#F97316' }} />
        </Box>

        {/* Texto principal */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="caption"
            sx={{
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              color: 'text.secondary',
              display: 'block',
            }}
          >
            Total Pendiente por Cobrar
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: '#F97316',
              mt: 0.25,
            }}
          >
            {formatCurrency(String(totalPendiente))}
          </Typography>
        </Box>

        {/* Cantidad de órdenes (esquina derecha) */}
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', fontWeight: 500 }}
          >
            {pendingOrders.length}{' '}
            {pendingOrders.length === 1 ? 'orden' : 'órdenes'}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.disabled' }}
          >
            pendientes
          </Typography>
        </Box>
      </Paper>

      {/* ── Tabla de datos — solo lectura, sin columna de acciones ── */}
      <DataTable
        rows={pendingOrders}
        columns={columns}
        loading={ordersQuery.isLoading}
        getRowId={(row) => row.id}
        onRowClick={handleRowClick}
        emptyMessage="No hay órdenes pendientes de pago"
      />
    </Box>
  );
};

export default PendingPaymentOrdersPage;
