import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Typography,
  TextField,
  MenuItem,
  Stack,
  LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { useProductionOrders } from '../hooks/useProduction';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import type { ProductionOrderStatus, ProductionOrderSummary } from '../../../types/production.types';
import type { ResponsiveGridColDef } from '../../../hooks';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

const STATUS_COLOR: Record<ProductionOrderStatus, 'default' | 'warning' | 'success' | 'error'> = {
  PENDING: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const STATUS_LABEL: Record<ProductionOrderStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const ProductionOrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission(PERMISSIONS.CREATE_PRODUCTION_ORDERS);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const ordersQuery = useProductionOrders({
    ...(statusFilter ? { status: statusFilter as ProductionOrderStatus } : {}),
    ...(search ? { search } : {}),
  });

  const orders: ProductionOrderSummary[] = (ordersQuery.data as any)?.data ?? ordersQuery.data ?? [];

  const columns: ResponsiveGridColDef[] = useMemo(
    () => [
      {
        field: 'oprodNumber',
        headerName: 'Código',
        width: 160,
        renderCell: (params: GridRenderCellParams<ProductionOrderSummary>) => (
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ cursor: 'pointer', color: 'primary.main' }}
            onClick={() =>
              navigate(ROUTES.PRODUCTION_ORDERS_DETAIL.replace(':id', params.row.id))
            }
          >
            {params.row.oprodNumber}
          </Typography>
        ),
      },
      {
        field: 'template',
        headerName: 'Plantilla',
        flex: 1,
        minWidth: 160,
        valueGetter: (_v: any, row: ProductionOrderSummary) => row.template?.name ?? '-',
      },
      {
        field: 'workOrder',
        headerName: 'OT Vinculada',
        width: 150,
        valueGetter: (_v: any, row: ProductionOrderSummary) =>
          row.workOrder?.workOrderNumber ?? '-',
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 130,
        renderCell: (params: GridRenderCellParams<ProductionOrderSummary>) => (
          <Chip
            label={STATUS_LABEL[params.row.status]}
            color={STATUS_COLOR[params.row.status]}
            size="small"
          />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Creada',
        width: 120,
        valueGetter: (_v: any, row: ProductionOrderSummary) =>
          new Date(row.createdAt).toLocaleDateString('es-CO'),
      },
    ],
    [navigate],
  );

  return (
    <Box>
      <PageHeader
        title="Órdenes de Producción"
        subtitle="Gestiona el flujo de producción de cada OT"
        icon={<PrecisionManufacturingIcon />}
        action={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(ROUTES.PRODUCTION_ORDERS_CREATE)}
            >
              Nueva OT Producción
            </Button>
          ) : undefined
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
        <TextField
          select
          label="Estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          size="small"
          sx={{ width: 200 }}
        >
          {STATUS_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Buscar por código o plantilla"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: 280 }}
        />
      </Stack>

      {ordersQuery.isFetching && <LinearProgress sx={{ mb: 1 }} />}

      <DataTable
        rows={orders}
        columns={columns}
        loading={ordersQuery.isLoading}
        onRowClick={(params) =>
          navigate(ROUTES.PRODUCTION_ORDERS_DETAIL.replace(':id', params.row.id))
        }
        getRowId={(row) => row.id}
      />
    </Box>
  );
};

export default ProductionOrdersListPage;
