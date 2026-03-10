import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  MenuItem,
  TextField,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { useInventory } from '../hooks/useInventory';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { InventoryMovement, InventoryMovementType } from '../../../types';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';
import { MovementTypeChip } from '../components/MovementTypeChip';

const MOVEMENT_TYPES: { value: InventoryMovementType; label: string }[] = [
  { value: 'ENTRY', label: 'Entrada' },
  { value: 'EXIT', label: 'Salida (OT)' },
  { value: 'ADJUSTMENT', label: 'Ajuste' },
  { value: 'RETURN', label: 'Devolución' },
  { value: 'INITIAL', label: 'Inicial' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatStock = (value?: number | null) =>
  value !== undefined && value !== null ? Number(value).toFixed(2) : '—';

const InventoryMovementsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission(PERMISSIONS.CREATE_INVENTORY_MOVEMENTS);

  const { movementsQuery, filters, updateFilters } = useInventory();
  const movements: InventoryMovement[] = movementsQuery.data?.data || [];

  const rawColumns: ResponsiveGridColDef[] = useMemo(
    () => [
      {
        field: 'supply',
        headerName: 'Insumo',
        flex: 1,
        minWidth: 160,
        renderCell: (params: GridRenderCellParams<InventoryMovement>) => (
          <Typography variant="body2" fontWeight={500}>
            {params.row.supply?.name ?? '—'}
          </Typography>
        ),
      },
      {
        field: 'type',
        headerName: 'Tipo',
        width: 130,
        renderCell: (params: GridRenderCellParams<InventoryMovement>) => (
          <MovementTypeChip type={params.row.type} />
        ),
      },
      {
        field: 'quantity',
        headerName: 'Cantidad',
        width: 100,
        valueGetter: (_v: any, row: InventoryMovement) => formatStock(Number(row.quantity)),
      },
      {
        field: 'previousStock',
        headerName: 'Stock Ant.',
        width: 110,
        responsive: 'sm',
        valueGetter: (_v: any, row: InventoryMovement) => formatStock(Number(row.previousStock)),
      },
      {
        field: 'newStock',
        headerName: 'Stock Nuevo',
        width: 120,
        valueGetter: (_v: any, row: InventoryMovement) => formatStock(Number(row.newStock)),
      },
      {
        field: 'unitCost',
        headerName: 'Costo Unit.',
        width: 120,
        responsive: 'md',
        valueGetter: (_v: any, row: InventoryMovement) =>
          row.unitCost != null
            ? `$${Number(row.unitCost).toLocaleString('es-CO')}`
            : '—',
      },
      {
        field: 'referenceType',
        headerName: 'Referencia',
        width: 130,
        responsive: 'md',
        valueGetter: (_v: any, row: InventoryMovement) =>
          row.referenceType === 'WORK_ORDER'
            ? `OT`
            : (row.referenceType ?? '—'),
      },
      {
        field: 'performedBy',
        headerName: 'Registrado por',
        flex: 1,
        minWidth: 150,
        responsive: 'sm',
        renderCell: (params: GridRenderCellParams<InventoryMovement>) => {
          const u = params.row.performedBy;
          const name =
            u?.firstName && u?.lastName
              ? `${u.firstName} ${u.lastName}`
              : (u?.email ?? '—');
          return <Typography variant="body2">{name}</Typography>;
        },
      },
      {
        field: 'createdAt',
        headerName: 'Fecha',
        width: 160,
        valueGetter: (_v: any, row: InventoryMovement) => formatDate(row.createdAt),
      },
    ],
    [],
  );

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box>
      <PageHeader
        title="Movimientos de Inventario"
        subtitle="Historial de entradas, salidas y ajustes de stock de insumos"
        icon={<InventoryIcon />}
        action={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(ROUTES.INVENTORY_MOVEMENTS_NEW)}
            >
              Nuevo Movimiento
            </Button>
          ) : undefined
        }
      />

      {/* Filtros */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          label="Tipo de movimiento"
          value={filters.type ?? ''}
          onChange={(e) =>
            updateFilters({ type: (e.target.value as InventoryMovementType) || undefined })
          }
          size="small"
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {MOVEMENT_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Fecha inicio"
          type="date"
          value={filters.startDate ?? ''}
          onChange={(e) => updateFilters({ startDate: e.target.value || undefined })}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />

        <TextField
          label="Fecha fin"
          type="date"
          value={filters.endDate ?? ''}
          onChange={(e) => updateFilters({ endDate: e.target.value || undefined })}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
      </Stack>

      <DataTable
        rows={movements}
        columns={columns}
        loading={movementsQuery.isLoading}
        searchPlaceholder="Buscar por insumo..."
        emptyMessage="No hay movimientos de inventario"
        pageSize={filters.limit ?? 20}
      />
    </Box>
  );
};

export default InventoryMovementsListPage;
