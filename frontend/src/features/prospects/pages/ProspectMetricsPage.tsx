import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../../../components/common/PageHeader';
import { useAuthStore } from '../../../store/authStore';
import { useUsers } from '../../users/hooks/useUsers';
import { PERMISSIONS } from '../../../utils/constants';
import { formatCurrency } from '../../../utils/formatters';
import {
  CONTACT_MEDIUM_LABELS,
  ProspectMetricsFilterDto,
} from '../../../types/prospect.types';
import { useProspectMetrics } from '../hooks/useProspects';

const MEDIUM_COLORS = ['#25D366', '#1976d2', '#ed6c02', '#9c27b0', '#e91e63', '#607d8b'];

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, hint }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export const ProspectMetricsPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canReadAll = hasPermission(PERMISSIONS.READ_ALL_PROSPECTS);

  // Por defecto, el mes en curso.
  const [filters, setFilters] = useState<ProspectMetricsFilterDto>(() => {
    const now = new Date();
    return {
      dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      dateTo: now.toISOString(),
    };
  });

  const metricsQuery = useProspectMetrics(filters);
  const { usersQuery } = useUsers({ enabled: canReadAll });
  const metrics = metricsQuery.data;

  const chartData =
    metrics?.contactsByMedium.map((m) => ({
      medio: CONTACT_MEDIUM_LABELS[m.medium],
      contactos: m.count,
    })) ?? [];

  return (
    <Box>
      <PageHeader
        title="Métricas del Pipeline"
        subtitle="Desempeño comercial por vendedora"
      />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4} md={3}>
            <DatePicker
              label="Desde"
              value={filters.dateFrom ? new Date(filters.dateFrom) : null}
              onChange={(d) =>
                setFilters((p) => ({ ...p, dateFrom: d ? d.toISOString() : undefined }))
              }
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <DatePicker
              label="Hasta"
              value={filters.dateTo ? new Date(filters.dateTo) : null}
              onChange={(d) =>
                setFilters((p) => ({ ...p, dateTo: d ? d.toISOString() : undefined }))
              }
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </Grid>
          {canReadAll && (
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                select
                label="Vendedora"
                fullWidth
                size="small"
                value={filters.advisorId ?? ''}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, advisorId: e.target.value || undefined }))
                }
              >
                <MenuItem value="">Todas</MenuItem>
                {(usersQuery.data ?? []).map((u: any) => (
                  <MenuItem key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
        </Grid>
      </Paper>

      {metricsQuery.isLoading || !metrics ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="Prospectos registrados"
                value={metrics.totalProspects}
                hint={`${metrics.contactedProspects} contactados`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="Contactos realizados"
                value={metrics.totalContacts}
                hint="Suma de todos los medios"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="Tasa de respuesta"
                value={`${metrics.responseRate}%`}
                hint={`${metrics.responded} de ${metrics.contactedProspects} contactados`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="Tasa de conversión"
                value={`${metrics.conversionRate}%`}
                hint={`${metrics.converted} de ${metrics.totalProspects} prospectos`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard
                label="Solicitaron cotización"
                value={metrics.quotesRequested}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard
                label="Cotizaciones generadas"
                value={metrics.quotesGenerated}
              />
            </Grid>
            <Grid item xs={12} sm={12} md={4}>
              <KpiCard
                label="Valor vendido"
                value={formatCurrency(metrics.totalRevenue)}
                hint="Solo órdenes reales enlazadas"
              />
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Contactos por medio
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="medio" />
                <YAxis allowDecimals={false} />
                <RechartsTooltip />
                <Bar dataKey="contactos" name="Contactos" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={MEDIUM_COLORS[index % MEDIUM_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Comparativo por vendedora
            </Typography>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Vendedora</TableCell>
                    <TableCell align="right">Prospectos</TableCell>
                    <TableCell align="right">Contactos</TableCell>
                    <TableCell align="right">Respondieron</TableCell>
                    <TableCell align="right">% Respuesta</TableCell>
                    <TableCell align="right">Pidieron cotización</TableCell>
                    <TableCell align="right">Cotizaciones</TableCell>
                    <TableCell align="right">Convertidos</TableCell>
                    <TableCell align="right">% Conversión</TableCell>
                    <TableCell align="right">Valor vendido</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.advisorBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No hay datos en el rango seleccionado.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.advisorBreakdown.map((a) => (
                      <TableRow key={a.advisorId} hover>
                        <TableCell>{a.advisorName}</TableCell>
                        <TableCell align="right">{a.totalProspects}</TableCell>
                        <TableCell align="right">{a.totalContacts}</TableCell>
                        <TableCell align="right">{a.responded}</TableCell>
                        <TableCell align="right">{a.responseRate}%</TableCell>
                        <TableCell align="right">{a.quotesRequested}</TableCell>
                        <TableCell align="right">{a.quotesGenerated}</TableCell>
                        <TableCell align="right">{a.converted}</TableCell>
                        <TableCell align="right">{a.conversionRate}%</TableCell>
                        <TableCell align="right">{formatCurrency(a.totalRevenue)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};
