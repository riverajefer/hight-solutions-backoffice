import React, { useState } from 'react';
import { Box, Typography, Alert, CircularProgress, Divider, alpha } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { dashboardApi } from '../../../api/dashboard.api';
import { DateRangeFilter, DateRange } from './DateRangeFilter';
import { FinancialKPICards } from './FinancialKPICards';
import { FinancialCharts } from './FinancialCharts';
import { FinancialSystemCounts } from './FinancialSystemCounts';
import { FinancialWidgets } from './FinancialWidgets';

const NEON_COLOR = '#F97316';

const defaultRange: DateRange = {
  dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  dateTo: format(new Date(), 'yyyy-MM-dd'),
};

const sectionTitleSx = {
  fontWeight: 700,
  fontSize: { xs: '0.95rem', md: '1.05rem' },
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  '&::before': {
    content: '""',
    width: 4,
    height: 18,
    borderRadius: 2,
    bgcolor: NEON_COLOR,
    display: 'inline-block',
  },
};

export const FinancialDashboard: React.FC = () => {
  const [range, setRange] = useState<DateRange>(defaultRange);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['financial-dashboard', range.dateFrom, range.dateTo],
    queryFn: () => dashboardApi.getFinancial({ dateFrom: range.dateFrom, dateTo: range.dateTo }),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 3 }}>
      {/* Header + filtros */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          p: { xs: 2, md: 2.5 },
          borderRadius: '16px',
          border: '1px solid',
          borderColor: (theme) => theme.palette.mode === 'dark' ? alpha(NEON_COLOR, 0.2) : alpha(NEON_COLOR, 0.15),
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? alpha(NEON_COLOR, 0.06)
              : alpha(NEON_COLOR, 0.03),
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ color: NEON_COLOR, lineHeight: 1 }}>
            Dashboard Financiero
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Métricas de ventas, gastos y utilidad del período seleccionado
          </Typography>
        </Box>
        <DateRangeFilter value={range} onChange={setRange} />
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: NEON_COLOR }} />
        </Box>
      )}

      {isError && (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          Error al cargar el dashboard financiero. Verifica tu conexión o permisos.
        </Alert>
      )}

      {data && (
        <>
          {/* Sección 1: KPI Cards */}
          <Box>
            <Typography variant="subtitle1" sx={{ ...sectionTitleSx, mb: 1.5 }}>
              Resumen del Período
            </Typography>
            <FinancialKPICards summary={data.summary} />
          </Box>

          <Divider sx={{ borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />

          {/* Sección 2: Gráficas */}
          <Box>
            <Typography variant="subtitle1" sx={{ ...sectionTitleSx, mb: 1.5 }}>
              Evolución Mensual
            </Typography>
            <FinancialCharts data={data.monthlyData} />
          </Box>

          <Divider sx={{ borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />

          {/* Sección 3: Indicadores del sistema */}
          <FinancialSystemCounts indicators={data.indicators} />

          <Divider sx={{ borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />

          {/* Sección 4: Widgets */}
          <Box>
            <Typography variant="subtitle1" sx={{ ...sectionTitleSx, mb: 1.5 }}>
              Actividad Reciente
            </Typography>
            <FinancialWidgets
              recentOrders={data.recentOrders}
              pendingOrders={data.pendingOrders}
              topClients={data.topClients}
            />
          </Box>
        </>
      )}
    </Box>
  );
};
