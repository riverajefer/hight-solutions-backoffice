import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { formatCurrency } from '../../../utils/formatters';
import { SupplyLot, SupplyLotSummary, SupplyLotView } from '../../../types';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';
import { useSupplyLots } from '../hooks/useSupplyLots';
import { SupplyLotStatusChip } from '../components/SupplyLotStatusChip';
import { SupplyLotProgress } from '../components/SupplyLotProgress';
import { SupplyLotFormDialog } from '../components/SupplyLotFormDialog';
import { formatLotDate, formatLotQuantity } from '../utils/supplyLotFormat';

const VIEWS: { value: SupplyLotView; label: string }[] = [
  { value: 'active', label: 'Vigentes' },
  { value: 'low', label: 'Bajo inventario' },
  { value: 'history', label: 'Histórico' },
  { value: 'all', label: 'Todos' },
];

const SummaryCard: React.FC<{
  summary: SupplyLotSummary;
  selected: boolean;
  onClick: () => void;
}> = ({ summary, selected, onClick }) => (
  <Card variant="outlined" sx={{ borderColor: selected ? 'primary.main' : undefined, height: '100%' }}>
    <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" noWrap>
            {summary.supplyName}
          </Typography>
          {summary.lowLots > 0 && (
            <Chip
              icon={<WarningAmberIcon />}
              label={`${summary.lowLots} bajo${summary.lowLots === 1 ? '' : 's'}`}
              color="warning"
              size="small"
            />
          )}
        </Stack>
        <Typography variant="h6" sx={{ mt: 0.5 }}>
          {formatLotQuantity(summary.remainingQuantity, summary.unit.abbreviation)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {summary.activeLots} rollo{summary.activeLots === 1 ? '' : 's'} vigente
          {summary.activeLots === 1 ? '' : 's'} · {formatCurrency(summary.remainingValue)} en inventario
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
);

const SupplyLotsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission(PERMISSIONS.CREATE_SUPPLY_LOTS);
  const [formOpen, setFormOpen] = useState(false);

  const { lotsQuery, summaryQuery, filters, updateFilters } = useSupplyLots();
  const lots = lotsQuery.data?.data ?? [];
  const summaries = summaryQuery.data ?? [];

  const rawColumns: ResponsiveGridColDef[] = useMemo(
    () => [
      {
        field: 'code',
        headerName: 'Rollo',
        width: 130,
        renderCell: (p: GridRenderCellParams<SupplyLot>) => (
          <Typography variant="body2" fontWeight={600}>
            {p.row.code}
          </Typography>
        ),
      },
      {
        field: 'supply',
        headerName: 'Tipo',
        flex: 1,
        minWidth: 140,
        responsive: 'sm',
        valueGetter: (_v: unknown, row: SupplyLot) => row.supply.name,
      },
      {
        field: 'initialQuantity',
        headerName: 'Inicial',
        width: 90,
        responsive: 'md',
        valueGetter: (_v: unknown, row: SupplyLot) =>
          formatLotQuantity(row.initialQuantity, row.supply.consumptionUnit.abbreviation),
      },
      {
        field: 'consumedQuantity',
        headerName: 'Consumido',
        width: 100,
        responsive: 'md',
        valueGetter: (_v: unknown, row: SupplyLot) =>
          formatLotQuantity(row.consumedQuantity, row.supply.consumptionUnit.abbreviation),
      },
      {
        field: 'remainingQuantity',
        headerName: 'Disponible',
        width: 100,
        valueGetter: (_v: unknown, row: SupplyLot) =>
          formatLotQuantity(row.remainingQuantity, row.supply.consumptionUnit.abbreviation),
      },
      {
        field: 'consumedPercent',
        headerName: '% consumido',
        width: 150,
        responsive: 'sm',
        renderCell: (p: GridRenderCellParams<SupplyLot>) => (
          <SupplyLotProgress percent={p.row.consumedPercent} status={p.row.displayStatus} />
        ),
      },
      {
        field: 'unitCost',
        headerName: 'Costo / unidad',
        width: 120,
        responsive: 'md',
        valueGetter: (_v: unknown, row: SupplyLot) => formatCurrency(row.unitCost),
      },
      {
        field: 'totalCost',
        headerName: 'Valor rollo',
        width: 120,
        responsive: 'md',
        valueGetter: (_v: unknown, row: SupplyLot) => formatCurrency(row.totalCost),
      },
      {
        field: 'receivedAt',
        headerName: 'Ingreso',
        width: 115,
        responsive: 'sm',
        valueGetter: (_v: unknown, row: SupplyLot) => formatLotDate(row.receivedAt),
      },
      {
        field: 'displayStatus',
        headerName: 'Estado',
        width: 140,
        renderCell: (p: GridRenderCellParams<SupplyLot>) => (
          <SupplyLotStatusChip status={p.row.displayStatus} />
        ),
      },
    ],
    [],
  );
  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box>
      <PageHeader
        title="Rollos y lotes"
        subtitle="Ingreso, saldo y estado de cada rollo de inventario"
        icon={<ViewInArOutlinedIcon />}
        action={
          canCreate ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
              Registrar rollo
            </Button>
          ) : undefined
        }
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {summaryQuery.isLoading
          ? [0, 1].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rounded" height={96} />
              </Grid>
            ))
          : summaries.map((s) => (
              <Grid item xs={12} sm={6} md={4} key={s.supplyId}>
                <SummaryCard
                  summary={s}
                  selected={filters.supplyId === s.supplyId}
                  onClick={() =>
                    updateFilters({ supplyId: filters.supplyId === s.supplyId ? undefined : s.supplyId })
                  }
                />
              </Grid>
            ))}
      </Grid>

      <Tabs
        value={filters.view ?? 'active'}
        onChange={(_, v: SupplyLotView) => updateFilters({ view: v })}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {VIEWS.map((v) => (
          <Tab key={v.value} value={v.value} label={v.label} />
        ))}
      </Tabs>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Tipo de rollo"
          value={filters.supplyId ?? ''}
          onChange={(e) => updateFilters({ supplyId: e.target.value || undefined })}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {summaries.map((s) => (
            <MenuItem key={s.supplyId} value={s.supplyId}>
              {s.supplyName}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataTable
        rows={lots}
        columns={columns}
        loading={lotsQuery.isLoading || lotsQuery.isFetching}
        onRowClick={(row: SupplyLot) => navigate(ROUTES.SUPPLY_LOTS_DETAIL.replace(':id', row.id))}
        searchPlaceholder="Buscar por código de rollo..."
        serverSideSearch
        searchValue={filters.search ?? ''}
        onSearchChange={(value) => updateFilters({ search: value || undefined })}
        emptyMessage={
          filters.view === 'history' ? 'No hay rollos agotados, cerrados ni anulados' : 'No hay rollos registrados'
        }
        rowCount={lotsQuery.data?.meta.total ?? 0}
        currentPage={(filters.page ?? 1) - 1}
        pageSize={filters.limit ?? 20}
        pageSizeOptions={[20, 50, 100]}
        onPaginationModelChange={(model) => updateFilters({ page: model.page + 1, limit: model.pageSize })}
      />

      <SupplyLotFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        supplies={summaries}
        defaultSupplyId={filters.supplyId}
      />
    </Box>
  );
};

export default SupplyLotsListPage;
