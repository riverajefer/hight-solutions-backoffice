import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { useInventory } from '../hooks/useInventory';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import type { LowStockSupply } from '../../../types';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';

const formatStock = (value?: number | null) =>
  value !== undefined && value !== null ? Number(value).toFixed(2) : '—';

const LowStockAlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission(PERMISSIONS.CREATE_INVENTORY_MOVEMENTS);

  const { lowStockQuery } = useInventory();
  const items: LowStockSupply[] = lowStockQuery.data ?? [];

  const rawColumns: ResponsiveGridColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Insumo',
        flex: 1,
        minWidth: 160,
        renderCell: (params: GridRenderCellParams<LowStockSupply>) => (
          <Typography variant="body2" fontWeight={500}>
            {params.row.name}
          </Typography>
        ),
      },
      {
        field: 'sku',
        headerName: 'SKU',
        width: 120,
        responsive: 'sm',
        valueGetter: (_v: any, row: LowStockSupply) => row.sku ?? '—',
      },
      {
        field: 'category',
        headerName: 'Categoría',
        width: 150,
        responsive: 'md',
        valueGetter: (_v: any, row: LowStockSupply) => row.category_name ?? '—',
      },
      {
        field: 'current_stock',
        headerName: 'Stock Actual',
        width: 120,
        renderCell: (params: GridRenderCellParams<LowStockSupply>) => (
          <Chip
            label={formatStock(Number(params.row.current_stock))}
            color="error"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        ),
      },
      {
        field: 'minimum_stock',
        headerName: 'Stock Mínimo',
        width: 120,
        valueGetter: (_v: any, row: LowStockSupply) =>
          formatStock(Number(row.minimum_stock)),
      },
      {
        field: 'deficit',
        headerName: 'Déficit',
        width: 110,
        renderCell: (params: GridRenderCellParams<LowStockSupply>) => {
          const deficit = Number(params.row.minimum_stock) - Number(params.row.current_stock);
          return (
            <Typography variant="body2" color="error.main" fontWeight={600}>
              -{formatStock(deficit)}
            </Typography>
          );
        },
      },
      {
        field: 'progress',
        headerName: 'Nivel',
        width: 120,
        responsive: 'sm',
        renderCell: (params: GridRenderCellParams<LowStockSupply>) => {
          const current = Number(params.row.current_stock);
          const minimum = Number(params.row.minimum_stock);
          const pct = minimum > 0 ? Math.min((current / minimum) * 100, 100) : 0;
          return (
            <Tooltip title={`${pct.toFixed(0)}% del mínimo`}>
              <Box sx={{ width: '100%', pt: 0.5 }}>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  color="error"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Tooltip>
          );
        },
      },
      ...(canCreate
        ? [
            {
              field: 'actions',
              headerName: '',
              width: 130,
              sortable: false,
              renderCell: (params: GridRenderCellParams<LowStockSupply>) => (
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<AddIcon />}
                  onClick={() =>
                    navigate(
                      `${ROUTES.INVENTORY_MOVEMENTS_NEW}?supplyId=${params.row.id}`,
                    )
                  }
                >
                  Entrada
                </Button>
              ),
            } as ResponsiveGridColDef,
          ]
        : []),
    ],
    [canCreate, navigate],
  );

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box>
      <PageHeader
        title="Alertas de Stock Bajo"
        subtitle="Insumos cuyo stock actual está por debajo del mínimo configurado"
        icon={<WarningAmberIcon color="warning" />}
      />

      {items.length === 0 && !lowStockQuery.isLoading && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No hay insumos con stock bajo en este momento.
        </Typography>
      )}

      <DataTable
        rows={items}
        columns={columns}
        loading={lowStockQuery.isLoading}
        searchPlaceholder="Buscar por insumo..."
        emptyMessage="Sin alertas de stock bajo"
        getRowId={(row: LowStockSupply) => row.id}
      />
    </Box>
  );
};

export default LowStockAlertsPage;
