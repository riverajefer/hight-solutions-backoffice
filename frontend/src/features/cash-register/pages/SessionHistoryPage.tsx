import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';
import { useCashRegisters, useCashSessions } from '../hooks/useCashRegister';
import { PATHS } from '../../../router/paths';
import type { CashSession, FilterCashSessionsDto } from '../../../types/cash-register.types';

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(value));

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const SessionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const registersQuery = useCashRegisters();

  const [filters, setFilters] = useState<FilterCashSessionsDto>({
    page: 1,
    limit: 25,
  });

  const sessionsQuery = useCashSessions(filters);
  const sessions = sessionsQuery.data?.data || [];

  const rawColumns: ResponsiveGridColDef[] = useMemo(
    () => [
      {
        field: 'cashRegister',
        headerName: 'Caja',
        flex: 1,
        minWidth: 140,
        valueGetter: (_: any, row: CashSession) => row.cashRegister?.name ?? '—',
      },
      {
        field: 'openedBy',
        headerName: 'Cajero',
        flex: 1,
        minWidth: 140,
        responsive: 'sm' as const,
        valueGetter: (_: any, row: CashSession) => {
          const u = row.openedBy;
          return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '—';
        },
      },
      {
        field: 'openedAt',
        headerName: 'Apertura',
        flex: 1,
        minWidth: 170,
        valueFormatter: (value: string) => (value ? formatDate(value) : '—'),
      },
      {
        field: 'closedAt',
        headerName: 'Cierre',
        flex: 1,
        minWidth: 170,
        responsive: 'sm' as const,
        valueFormatter: (value: string) => (value ? formatDate(value) : '—'),
      },
      {
        field: 'openingAmount',
        headerName: 'Fondo',
        width: 130,
        align: 'right' as const,
        headerAlign: 'right' as const,
        responsive: 'md' as const,
        valueFormatter: (value: string) => (value ? formatCurrency(value) : '—'),
      },
      {
        field: 'discrepancy',
        headerName: 'Descuadre',
        width: 140,
        align: 'center' as const,
        headerAlign: 'center' as const,
        responsive: 'md' as const,
        renderCell: (params: GridRenderCellParams<CashSession>) => {
          if (params.row.status !== 'CLOSED' || params.value === undefined || params.value === null) {
            return null;
          }
          const val = Number(params.value);
          const color = val === 0 ? 'success' : val > 0 ? 'warning' : 'error';
          const label = val === 0 ? 'Cuadrada' : val > 0 ? `+${formatCurrency(val)}` : formatCurrency(val);
          return <Chip label={label} color={color} size="small" variant="outlined" />;
        },
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 110,
        align: 'center' as const,
        headerAlign: 'center' as const,
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            label={params.value === 'OPEN' ? 'Abierta' : 'Cerrada'}
            color={params.value === 'OPEN' ? 'success' : 'default'}
            size="small"
          />
        ),
      },
    ],
    [],
  );

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title="Historial de Sesiones"
        subtitle="Consulta todas las sesiones de caja anteriores"
      />

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel>Caja Registradora</InputLabel>
          <Select
            value={filters.cashRegisterId ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, cashRegisterId: e.target.value || undefined, page: 1 }))
            }
            label="Caja Registradora"
          >
            <MenuItem value="">Todas</MenuItem>
            {(registersQuery.data || []).map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 140 }} size="small">
          <InputLabel>Estado</InputLabel>
          <Select
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: (e.target.value as 'OPEN' | 'CLOSED') || undefined,
                page: 1,
              }))
            }
            label="Estado"
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="OPEN">Abierta</MenuItem>
            <MenuItem value="CLOSED">Cerrada</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Desde"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.openedFrom ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, openedFrom: e.target.value || undefined, page: 1 }))
          }
        />

        <TextField
          label="Hasta"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.openedTo ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, openedTo: e.target.value || undefined, page: 1 }))
          }
        />
      </Box>

      <DataTable
        rows={sessions}
        columns={columns}
        loading={sessionsQuery.isLoading}
        onRowClick={(params) =>
          navigate(PATHS.CASH_SESSION_HISTORY_DETAIL.replace(':id', params.id as string))
        }
        searchPlaceholder="Buscar sesiones..."
      />
    </Box>
  );
};

export default SessionHistoryPage;
