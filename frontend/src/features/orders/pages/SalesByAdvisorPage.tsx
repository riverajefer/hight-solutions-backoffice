import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  MenuItem,
  TextField,
  Autocomplete,
  Button,
  Skeleton,
  Tab,
  Tabs,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  BarChart as BarChartIcon,
  Visibility as VisibilityIcon,
  BarChart as SalesIcon,
  EmojiEvents as GoalsIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { useOrders, useSalesSummary } from '../hooks';
import { ordersApi } from '../../../api';
import { useClients } from '../../clients/hooks/useClients';
import { useProductionAreas } from '../../production-areas/hooks/useProductionAreas';
import { useUsers } from '../../users/hooks/useUsers';
import { OrderStatusChip, SalesGoalsSection } from '../components';
import { ROUTES } from '../../../utils/constants';
import type { FilterOrdersDto, OrderStatus } from '../../../types/order.types';
import type { Client } from '../../../types/client.types';

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

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatCurrencyStr = (value: string): string =>
  formatCurrency(parseFloat(value));

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('es-CO').format(new Date(date));

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, loading, color }) => (
  <Card variant="outlined" sx={{ flex: 1, minWidth: 0 }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: color ? `${color}.light` : 'primary.light',
          color: color ? `${color}.dark` : 'primary.dark',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        {loading ? (
          <Skeleton width={120} height={28} />
        ) : (
          <Typography variant="h6" fontWeight={700}>
            {value}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
);

export const SalesByAdvisorPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<FilterOrdersDto>({ page: 1, limit: 20 });

  const { ordersQuery } = useOrders(filters);
  const summaryQuery = useSalesSummary(filters);
  const { clientsQuery } = useClients({ includeInactive: false });
  const { productionAreasQuery } = useProductionAreas();
  const { usersQuery } = useUsers();

  const orders = ordersQuery.data?.data || [];
  const clients = clientsQuery.data || [];
  const productionAreas = productionAreasQuery.data || [];
  const users = usersQuery.data || [];
  const summary = summaryQuery.data;

  const selectedClient = filters.clientId
    ? clients.find((c: Client) => c.id === filters.clientId) ?? null
    : null;

  const selectedArea = filters.productionAreaId
    ? productionAreas.find((a: any) => a.id === filters.productionAreaId) ?? null
    : null;

  const selectedUser = filters.createdById
    ? users.find((u: any) => u.id === filters.createdById) ?? null
    : null;

  // Query to get all orders (unfiltered) for extracting advisor IDs
  const allOrdersForAdvisorsQuery = useQuery({
    queryKey: ['orders-all-advisors'],
    queryFn: () => ordersApi.getAll({ page: 1, limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  // Set of user IDs who have created at least one order
  const orderCreatorIds = useMemo(() => {
    const ids = new Set<string>();
    for (const order of allOrdersForAdvisorsQuery.data?.data ?? []) {
      if (order.createdBy?.id) ids.add(order.createdBy.id);
    }
    return ids;
  }, [allOrdersForAdvisorsQuery.data]);

  // Users who have role "Comercial" OR have created at least one order
  const advisorOptions = useMemo(() => {
    return users.filter((u: any) =>
      u.role?.name?.toLowerCase().includes('comercial') ||
      orderCreatorIds.has(u.id),
    );
  }, [users, orderCreatorIds]);

  const handleFilterChange = (key: keyof FilterOrdersDto, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleClearFilters = () => setFilters({ page: 1, limit: 20 });

  const columns = useMemo(() => [
    {
      field: 'orderNumber',
      headerName: 'N° Orden',
      width: 130,
      renderCell: (params: any) => (
        <Box sx={{ fontWeight: 600, color: 'primary.main' }}>{params.value}</Box>
      ),
    },
    {
      field: 'orderDate',
      headerName: 'Fecha',
      width: 130,
      renderCell: (params: any) => formatDate(params.value),
    },
    {
      field: 'client',
      headerName: 'Cliente',
      flex: 1,
      minWidth: 150,
      valueGetter: (_: any, row: any) => row.client?.name ?? '—',
    },
    {
      field: 'createdBy',
      headerName: 'Asesor',
      width: 160,
      valueGetter: (_: any, row: any) =>
        `${row.createdBy?.firstName ?? ''} ${row.createdBy?.lastName ?? ''}`.trim() || '—',
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 150,
      renderCell: (params: any) => <OrderStatusChip status={params.value} />,
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 140,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: any) => (
        <Box sx={{ fontWeight: 600 }}>{formatCurrencyStr(params.value)}</Box>
      ),
    },
    {
      field: 'balance',
      headerName: 'Saldo',
      width: 140,
      align: 'right' as const,
      headerAlign: 'right' as const,
      renderCell: (params: any) => {
        const balance = parseFloat(params.value);
        return (
          <Box sx={{ color: balance > 0 ? 'warning.main' : 'success.main', fontWeight: 500 }}>
            {formatCurrencyStr(params.value)}
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 100,
      sortable: false,
      renderCell: (params: any) => (
        <Button
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={() => navigate(ROUTES.ORDERS_DETAIL.replace(':id', params.row.id))}
        >
          Ver
        </Button>
      ),
    },
  ], [navigate]);

  const hasActiveFilters =
    filters.status ||
    filters.clientId ||
    filters.orderDateFrom ||
    filters.orderDateTo ||
    filters.search ||
    filters.productionAreaId ||
    filters.createdById;

  const advisors = users.map((u: any) => ({
    id: u.id,
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    email: u.email ?? null,
  }));

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title="Ventas por Asesor"
        breadcrumbs={[{ label: 'Comercial' }, { label: 'Ventas por Asesor' }]}
      />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, mt: 1 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab
            icon={<SalesIcon fontSize="small" />}
            iconPosition="start"
            label="Ventas"
          />
          <Tab
            icon={<GoalsIcon fontSize="small" />}
            iconPosition="start"
            label="Metas de Ventas"
          />
        </Tabs>
      </Box>

      {/* Tab 0 — Ventas */}
      {activeTab === 0 && (
        <>
          {/* Métricas */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              mb: 3,
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <MetricCard
              title="Total Vendido"
              value={summary ? formatCurrency(summary.totalRevenue) : '—'}
              icon={<TrendingUpIcon />}
              loading={summaryQuery.isLoading}
              color="success"
            />
            <MetricCard
              title="Número de Órdenes"
              value={summary ? summary.totalOrders.toString() : '—'}
              icon={<ReceiptIcon />}
              loading={summaryQuery.isLoading}
              color="primary"
            />
            <MetricCard
              title="Valor Promedio por OP"
              value={summary ? formatCurrency(summary.averageOrderValue) : '—'}
              icon={<BarChartIcon />}
              loading={summaryQuery.isLoading}
              color="warning"
            />
          </Box>

          {/* Filtros */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: 'repeat(3, 1fr)',
                lg: '1fr 1fr 1.5fr 1.5fr 1fr 1fr auto',
              },
              gap: 2,
              mb: 3,
            }}
          >
            <Autocomplete
              options={advisorOptions}
              getOptionLabel={(u: any) =>
                `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
              }
              value={selectedUser}
              onChange={(_: any, newValue: any) =>
                handleFilterChange('createdById', newValue?.id ?? undefined)
              }
              size="small"
              renderInput={(params) => <TextField {...params} label="Asesor" />}
            />

            <TextField
              select
              label="Estado"
              value={filters.status || ''}
              onChange={(e) =>
                handleFilterChange('status', e.target.value || undefined)
              }
              fullWidth
              size="small"
            >
              <MenuItem value="">Todos los estados</MenuItem>
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <DatePicker
              label="Fecha desde"
              value={filters.orderDateFrom ? new Date(filters.orderDateFrom) : null}
              onChange={(date) =>
                handleFilterChange(
                  'orderDateFrom',
                  date ? date.toISOString().split('T')[0] : undefined,
                )
              }
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />

            <DatePicker
              label="Fecha hasta"
              value={filters.orderDateTo ? new Date(filters.orderDateTo) : null}
              onChange={(date) =>
                handleFilterChange(
                  'orderDateTo',
                  date ? date.toISOString().split('T')[0] : undefined,
                )
              }
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />

            <Autocomplete
              options={clients}
              getOptionLabel={(c: Client) => c.name}
              value={selectedClient}
              onChange={(_: any, newValue: Client | null) =>
                handleFilterChange('clientId', newValue?.id ?? undefined)
              }
              size="small"
              renderInput={(params) => <TextField {...params} label="Cliente" />}
            />

            <Autocomplete
              options={productionAreas}
              getOptionLabel={(a: any) => a.name}
              value={selectedArea}
              onChange={(_: any, newValue: any) =>
                handleFilterChange('productionAreaId', newValue?.id ?? undefined)
              }
              size="small"
              renderInput={(params) => (
                <TextField {...params} label="Área de Producción" />
              )}
            />

            {hasActiveFilters && (
              <Button
                variant="text"
                onClick={handleClearFilters}
                size="small"
                sx={{ alignSelf: 'center' }}
              >
                Limpiar
              </Button>
            )}
          </Box>

          {/* Búsqueda */}
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Buscar (N° orden, cliente...)"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
              size="small"
              sx={{ width: { xs: '100%', sm: 320 } }}
            />
          </Box>

          {/* Tabla */}
          <DataTable
            rows={orders}
            columns={columns}
            loading={ordersQuery.isLoading}
            rowCount={ordersQuery.data?.meta?.total ?? 0}
            pageSize={filters.limit ?? 20}
            onPaginationModelChange={({ page, pageSize }: { page: number; pageSize: number }) => {
              handleFilterChange('page', page + 1);
              handleFilterChange('limit', pageSize);
            }}
          />
        </>
      )}

      {/* Tab 1 — Metas de Ventas */}
      {activeTab === 1 && (
        <SalesGoalsSection advisors={advisors} />
      )}
    </Box>
  );
};

export default SalesByAdvisorPage;
