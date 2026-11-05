import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  Chip,
  CircularProgress,
  LinearProgress,
  Link,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  differenceInCalendarDays,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import StorefrontIcon from '@mui/icons-material/Storefront';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { PageHeader } from '../../../components/common/PageHeader';
import { dashboardApi } from '../../../api/dashboard.api';
import { formatCurrency } from '../../../utils/formatters';
import type {
  CommercialAdvisorRow,
  CommercialAgingBucket,
  CommercialDashboardResponse,
  CommercialFunnelStage,
  CommercialSalesByStatus,
  CommercialTopDebtor,
} from '../../../types/dashboard.types';

// ---------------------------------------------------------------------------
// Periodo
// ---------------------------------------------------------------------------

type PeriodPreset = 'this_month' | 'last_month' | 'last_30' | 'this_year' | 'custom';

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  this_month: 'Este mes',
  last_month: 'Mes anterior',
  last_30: 'Últimos 30 días',
  this_year: 'Este año',
  custom: 'Personalizado',
};

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

const presetRange = (preset: Exclude<PeriodPreset, 'custom'>) => {
  const today = new Date();
  switch (preset) {
    case 'this_month':
      return { from: ymd(startOfMonth(today)), to: ymd(endOfMonth(today)) };
    case 'last_month': {
      const prev = subMonths(today, 1);
      return { from: ymd(startOfMonth(prev)), to: ymd(endOfMonth(prev)) };
    }
    case 'last_30':
      return { from: ymd(subDays(today, 29)), to: ymd(today) };
    case 'this_year':
      return { from: ymd(startOfYear(today)), to: ymd(endOfYear(today)) };
  }
};

const periodSubtitle = (from: string, to: string) => {
  const a = parseISO(from);
  const b = parseISO(to);
  if (ymd(startOfMonth(a)) === from && ymd(endOfMonth(a)) === to) {
    const label = format(a, "MMMM 'de' yyyy", { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return `${format(a, 'd MMM yyyy', { locale: es })} – ${format(b, 'd MMM yyyy', { locale: es })}`;
};

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

/** $30,4 M · $850 mil — la cifra completa va en el tooltip. */
const compactCOP = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  }
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000).toLocaleString('es-CO')} mil`;
  return `${sign}$${Math.round(abs)}`;
};

const pct = (value: number) => `${Math.round(value * 100)} %`;

const Money: React.FC<{ value: number; variant?: 'compact' | 'full' }> = ({ value, variant = 'compact' }) =>
  variant === 'full' ? (
    <>{formatCurrency(value, 0)}</>
  ) : (
    <Tooltip title={formatCurrency(value, 0)} arrow>
      <span>{compactCOP(value)}</span>
    </Tooltip>
  );

const tabular = { fontVariantNumeric: 'tabular-nums' } as const;

/** Las cifras no se parten en dos renglones: la tabla se desplaza de lado si no cabe. */
const NOWRAP_TABLE = { '& td, & th': { whiteSpace: 'nowrap' } } as const;

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  caption: React.ReactNode;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, caption, icon, color }) => (
  <Card sx={{ p: 2.5, minWidth: 0, height: '100%' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.3 }}
      >
        {label}
      </Typography>
      <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(color, 0.14), color, display: 'flex', flexShrink: 0 }}>
        {icon}
      </Box>
    </Box>
    <Typography variant="h4" fontWeight={800} sx={{ mt: 1.5, ...tabular }}>
      {value}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
      {caption}
    </Typography>
  </Card>
);

const Panel: React.FC<{ title: string; subtitle?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  subtitle,
  children,
  action,
}) => (
  <Card sx={{ p: { xs: 2, md: 3 }, minWidth: 0, height: '100%' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 2.5 }}>
      <Box>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
    {children}
  </Card>
);

/**
 * Fila de barra horizontal. `filled` pinta la parte sólida; `secondary` (opcional)
 * pinta a continuación una parte translúcida del mismo color — en ventas es lo
 * que falta por cobrar.
 */
const BarRow: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  filled: number;
  secondary?: number;
  max: number;
  color: string;
}> = ({ label, value, detail, filled, secondary = 0, max, color }) => {
  const theme = useTheme();
  const w = (n: number) => (max > 0 ? `${Math.max(0, (n / max) * 100)}%` : '0%');
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr auto', sm: 'minmax(120px, 160px) 1fr minmax(84px, auto)' },
        gridTemplateAreas: { xs: '"label value" "bar bar"', sm: '"label bar value"' },
        alignItems: 'center',
        columnGap: 2,
        rowGap: 0.5,
      }}
    >
      <Box sx={{ gridArea: 'label', minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {label}
        </Typography>
        {detail && (
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {detail}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          gridArea: 'bar',
          height: 28,
          borderRadius: 1.5,
          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.05),
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ width: w(filled), bgcolor: color, transition: 'width .4s ease' }} />
        {secondary > 0 && <Box sx={{ width: w(secondary), bgcolor: alpha(color, 0.35), transition: 'width .4s ease' }} />}
      </Box>
      <Typography variant="body2" fontWeight={800} sx={{ gridArea: 'value', textAlign: 'right', ...tabular }}>
        {value}
      </Typography>
    </Box>
  );
};

const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
    {children}
  </Typography>
);

// ---------------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------------

const SalesByStatusPanel: React.FC<{ rows: CommercialSalesByStatus[] }> = ({ rows }) => {
  const theme = useTheme();
  const colors: Record<string, string> = {
    DELIVERED: theme.palette.success.main,
    READY: theme.palette.warning.main,
    IN_PRODUCTION: theme.palette.info.main,
    CONFIRMED: theme.palette.primary.main,
    WARRANTY: theme.palette.secondary.main,
    DRAFT: theme.palette.grey[500],
  };
  // Garantía casi nunca tiene movimiento: solo se muestra si lo tiene.
  const visible = rows.filter((r) => r.key !== 'WARRANTY' || r.orders > 0);
  const max = Math.max(...visible.map((r) => r.amount), 0);
  const total = visible.reduce((t, r) => t + r.amount, 0);

  return (
    <Panel
      title="Ventas por estado"
      subtitle="OP del período. La parte sólida es lo cobrado; la clara, lo que falta por cobrar."
    >
      {total === 0 ? (
        <EmptyState>No hay órdenes de pedido en este período.</EmptyState>
      ) : (
        <Stack spacing={2}>
          {visible.map((r) => (
            <BarRow
              key={r.key}
              label={r.label}
              detail={`${r.orders} OP · ${r.amount > 0 ? pct(r.collected / r.amount) : '0 %'} cobrado`}
              value={<Money value={r.amount} />}
              filled={r.collected}
              secondary={r.amount - r.collected}
              max={max}
              color={colors[r.key] ?? theme.palette.primary.main}
            />
          ))}
        </Stack>
      )}
    </Panel>
  );
};

const AgingPanel: React.FC<{ buckets: CommercialAgingBucket[] }> = ({ buckets }) => {
  const theme = useTheme();
  const colors: Record<string, string> = {
    '0-30': theme.palette.info.main,
    '31-60': theme.palette.warning.main,
    '61-90': theme.palette.error.light,
    '90+': theme.palette.error.main,
  };
  const max = Math.max(...buckets.map((b) => b.balance), 0);
  const total = buckets.reduce((t, b) => t + b.balance, 0);
  const over60 = buckets.filter((b) => b.key === '61-90' || b.key === '90+').reduce((t, b) => t + b.balance, 0);

  return (
    <Panel title="Cartera por edades" subtitle="Saldo pendiente a hoy, según la antigüedad de la OP.">
      {total === 0 ? (
        <EmptyState>No hay cartera pendiente.</EmptyState>
      ) : (
        <>
          <Stack spacing={2}>
            {buckets.map((b) => (
              <BarRow
                key={b.key}
                label={b.label}
                detail={`${b.orders} OP · ${pct(b.balance / total)} de la cartera`}
                value={<Money value={b.balance} />}
                filled={b.balance}
                max={max}
                color={colors[b.key]}
              />
            ))}
          </Stack>
          {over60 > 0 && (
            <Alert severity={over60 / total >= 0.3 ? 'warning' : 'info'} sx={{ mt: 2.5 }}>
              {pct(over60 / total)} de la cartera ({compactCOP(over60)}) tiene más de 60 días.
            </Alert>
          )}
        </>
      )}
    </Panel>
  );
};

const GoalPanel: React.FC<{ data: CommercialDashboardResponse }> = ({ data }) => {
  const theme = useTheme();
  const { goal } = data;
  const monthLabel = format(new Date(goal.year, goal.month - 1, 1), 'MMMM yyyy', { locale: es });
  const color =
    goal.progress >= 1
      ? theme.palette.success.main
      : goal.progress >= 0.7
        ? theme.palette.info.main
        : goal.progress >= 0.4
          ? theme.palette.warning.main
          : theme.palette.error.main;

  return (
    <Panel
      title="Avance de meta"
      subtitle={`Meta de ${monthLabel}. Cuenta la venta neta sin IVA de las OP entregadas y pagadas, igual que «Ventas por Asesor».`}
    >
      {!goal.hasGoal ? (
        <EmptyState>
          No hay meta cargada para {monthLabel}
          {data.advisorId ? ' para esta asesora' : ''}. Se configura en «Ventas por Asesor».
        </EmptyState>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h3" fontWeight={800} sx={{ color, ...tabular }}>
              {pct(goal.progress)}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={tabular}>
              <Money value={goal.achieved} variant="full" /> de <Money value={goal.target} variant="full" />
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, goal.progress * 100)}
            sx={{
              mt: 2,
              height: 12,
              borderRadius: 6,
              bgcolor: alpha(color, 0.15),
              '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 6 },
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {goal.remaining > 0 ? (
              <>
                Faltan <strong>{formatCurrency(goal.remaining, 0)}</strong> para cumplir la meta.
              </>
            ) : (
              <>Meta cumplida. 🎉</>
            )}
          </Typography>
        </Box>
      )}
    </Panel>
  );
};

const FUNNEL_STAGES: Array<{ key: string; label: string; statuses: string[]; tone: 'grey' | 'info' | 'warning' | 'success' | 'error' }> = [
  { key: 'draft', label: 'Borrador', statuses: ['DRAFT'], tone: 'grey' },
  { key: 'sent', label: 'Enviadas', statuses: ['SENT'], tone: 'info' },
  { key: 'follow', label: 'En seguimiento', statuses: ['FOLLOW_UP_1', 'FOLLOW_UP_2', 'FOLLOW_UP_3'], tone: 'warning' },
  { key: 'won', label: 'Aceptadas / convertidas', statuses: ['ACCEPTED', 'CONVERTED'], tone: 'success' },
  { key: 'lost', label: 'Rechazadas / sin respuesta', statuses: ['REJECTED', 'NO_RESPONSE'], tone: 'error' },
];

const FunnelPanel: React.FC<{ stages: CommercialFunnelStage[]; openAmount: number; openCount: number }> = ({
  stages,
  openAmount,
  openCount,
}) => {
  const theme = useTheme();
  const byStatus = new Map(stages.map((s) => [s.status, s]));
  const rows = FUNNEL_STAGES.map((stage) =>
    stage.statuses.reduce(
      (t, s) => ({ ...t, count: t.count + (byStatus.get(s)?.count ?? 0), amount: t.amount + (byStatus.get(s)?.amount ?? 0) }),
      { ...stage, count: 0, amount: 0 },
    ),
  );
  const max = Math.max(...rows.map((r) => r.count), 0);
  const toneColor = (tone: (typeof FUNNEL_STAGES)[number]['tone']) =>
    tone === 'grey' ? theme.palette.grey[500] : theme.palette[tone].main;

  return (
    <Panel
      title="Embudo de cotizaciones"
      subtitle="Cotizaciones del período según su estado actual."
      action={
        openCount > 0 ? (
          <Tooltip title="Cotizaciones enviadas o en seguimiento: es la venta que todavía se puede ganar." arrow>
            <Chip color="warning" variant="outlined" label={`${compactCOP(openAmount)} en juego`} sx={{ fontWeight: 700 }} />
          </Tooltip>
        ) : undefined
      }
    >
      {max === 0 ? (
        <EmptyState>No hay cotizaciones en este período.</EmptyState>
      ) : (
        <Stack spacing={2}>
          {rows.map((r) => (
            <BarRow
              key={r.key}
              label={r.label}
              detail={<Money value={r.amount} variant="full" />}
              value={r.count}
              filled={r.count}
              max={max}
              color={toneColor(r.tone)}
            />
          ))}
        </Stack>
      )}
    </Panel>
  );
};

const RankingPanel: React.FC<{ rows: CommercialAdvisorRow[]; onSelect: (id: string) => void }> = ({ rows, onSelect }) => (
  <Panel title="Ranking de asesoras" subtitle="Ordenado por venta del período. Haz clic en un nombre para ver solo sus cifras.">
    {rows.length === 0 ? (
      <EmptyState>Nadie vendió ni cotizó en este período.</EmptyState>
    ) : (
      <TableContainer sx={{ mx: { xs: -2, md: -3 }, width: 'auto' }}>
        <Table size="small" sx={NOWRAP_TABLE}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ pl: { xs: 2, md: 3 } }}>Asesora</TableCell>
              <TableCell align="right">Venta</TableCell>
              <TableCell align="right">OP</TableCell>
              <TableCell align="right">Ticket prom.</TableCell>
              <TableCell align="right">Cotiz.</TableCell>
              <TableCell align="right">Conversión</TableCell>
              <TableCell align="right">Clientes nuevos</TableCell>
              <TableCell align="right">Cartera</TableCell>
              <TableCell align="right">Cartera +90 d</TableCell>
              <TableCell align="right" sx={{ pr: { xs: 2, md: 3 }, minWidth: 120 }}>
                Meta
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.advisorId} hover>
                <TableCell sx={{ pl: { xs: 2, md: 3 }, whiteSpace: 'nowrap' }}>
                  <Link component="button" variant="body2" fontWeight={600} underline="hover" onClick={() => onSelect(r.advisorId)}>
                    {r.advisorName}
                  </Link>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, ...tabular }}>
                  <Money value={r.salesAmount} />
                </TableCell>
                <TableCell align="right" sx={tabular}>
                  {r.salesOrders}
                </TableCell>
                <TableCell align="right" sx={tabular}>
                  <Money value={r.averageTicket} />
                </TableCell>
                <TableCell align="right" sx={tabular}>
                  {r.quotes}
                </TableCell>
                <TableCell align="right" sx={tabular}>
                  {r.quotes > 0 ? pct(r.conversionRate) : '—'}
                </TableCell>
                <TableCell align="right" sx={tabular}>
                  {r.newClients}
                </TableCell>
                <TableCell align="right" sx={tabular}>
                  <Money value={r.portfolio} />
                </TableCell>
                <TableCell align="right" sx={{ ...tabular, color: r.portfolioOver90 > 0 ? 'error.main' : 'text.secondary' }}>
                  {r.portfolioOver90 > 0 ? <Money value={r.portfolioOver90} /> : '—'}
                </TableCell>
                <TableCell align="right" sx={{ pr: { xs: 2, md: 3 } }}>
                  {r.goalProgress === null ? (
                    <Typography variant="caption" color="text.secondary">
                      Sin meta
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, r.goalProgress * 100)}
                        color={r.goalProgress >= 1 ? 'success' : r.goalProgress >= 0.5 ? 'info' : 'warning'}
                        sx={{ width: 56, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" fontWeight={700} sx={tabular}>
                        {pct(r.goalProgress)}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </Panel>
);

const TopDebtorsPanel: React.FC<{ rows: CommercialTopDebtor[] }> = ({ rows }) => {
  const today = new Date();
  return (
    <Panel title="Clientes con más cartera" subtitle="Los 10 clientes que más deben a hoy.">
      {rows.length === 0 ? (
        <EmptyState>No hay clientes con saldo pendiente.</EmptyState>
      ) : (
        <TableContainer sx={{ mx: { xs: -2, md: -3 }, width: 'auto' }}>
          <Table size="small" sx={NOWRAP_TABLE}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: { xs: 2, md: 3 } }}>Cliente</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell align="right">OP con saldo</TableCell>
                <TableCell align="right" sx={{ pr: { xs: 2, md: 3 } }}>
                  OP más antigua
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const days = differenceInCalendarDays(today, parseISO(r.oldestOrderDate));
                return (
                  <TableRow key={r.clientId} hover>
                    <TableCell sx={{ pl: { xs: 2, md: 3 }, maxWidth: 280 }}>
                      <Link component={RouterLink} to={`/clients/${r.clientId}`} underline="hover" fontWeight={600} noWrap sx={{ display: 'block' }}>
                        {r.clientName}
                      </Link>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, ...tabular }}>
                      {formatCurrency(r.balance, 0)}
                    </TableCell>
                    <TableCell align="right" sx={tabular}>
                      {r.orders}
                    </TableCell>
                    <TableCell align="right" sx={{ pr: { xs: 2, md: 3 } }}>
                      <Chip
                        size="small"
                        label={`${days} días`}
                        color={days > 90 ? 'error' : days > 60 ? 'warning' : 'default'}
                        variant={days > 60 ? 'filled' : 'outlined'}
                        sx={tabular}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const CommercialDashboardPage: React.FC = () => {
  const theme = useTheme();
  const [preset, setPreset] = useState<PeriodPreset>('this_month');
  const [custom, setCustom] = useState(() => presetRange('this_month'));
  const [advisorId, setAdvisorId] = useState('');

  const range = useMemo(() => (preset === 'custom' ? custom : presetRange(preset)), [preset, custom]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['commercial-dashboard', range.from, range.to, advisorId],
    queryFn: () =>
      dashboardApi.getCommercial({ dateFrom: range.from, dateTo: range.to, advisorId: advisorId || undefined }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
  });

  const advisorName = data?.advisors.find((a) => a.id === advisorId)?.name;
  const scopeLabel = data?.scopedToOwn ? 'Tus cifras' : advisorName ? `Asesora: ${advisorName}` : 'Todo el equipo';

  const k = data?.kpis;

  return (
    <Box sx={{ pb: 3 }}>
      <PageHeader
        title="Tablero Comercial"
        subtitle={`${scopeLabel} · ${periodSubtitle(range.from, range.to)}`}
        icon={<StorefrontIcon />}
        breadcrumbs={[{ label: 'Comercial' }, { label: 'Tablero Comercial' }]}
      />

      <Card sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
            gap: 1.5,
            alignItems: 'center',
          }}
        >
          <TextField
            select
            size="small"
            label="Periodo"
            value={preset}
            onChange={(e) => {
              const next = e.target.value as PeriodPreset;
              // Al pasar a personalizado se parte del rango que se estaba viendo.
              if (next === 'custom') setCustom(range);
              setPreset(next);
            }}
          >
            {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((p) => (
              <MenuItem key={p} value={p}>
                {PERIOD_LABELS[p]}
              </MenuItem>
            ))}
          </TextField>
          {preset === 'custom' && (
            <>
              <DatePicker
                label="Desde"
                value={parseISO(custom.from)}
                maxDate={parseISO(custom.to)}
                onChange={(v) => v && !Number.isNaN(v.getTime()) && setCustom((c) => ({ ...c, from: ymd(v) }))}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DatePicker
                label="Hasta"
                value={parseISO(custom.to)}
                minDate={parseISO(custom.from)}
                onChange={(v) => v && !Number.isNaN(v.getTime()) && setCustom((c) => ({ ...c, to: ymd(v) }))}
                slotProps={{ textField: { size: 'small' } }}
              />
            </>
          )}
          {data && !data.scopedToOwn ? (
            <TextField
              select
              size="small"
              label="Asesora"
              value={advisorId}
              onChange={(e) => setAdvisorId(e.target.value)}
              SelectProps={{ displayEmpty: true }}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="">Todo el equipo</MenuItem>
              {data.advisors.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
          ) : data?.scopedToOwn ? (
            <Box>
              <Chip label="Ves solo tus cifras" variant="outlined" />
            </Box>
          ) : null}
        </Box>
      </Card>

      {isFetching && !isLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && !data && <Alert severity="error">No se pudo cargar el tablero comercial. Intenta de nuevo en unos segundos.</Alert>}

      {data && k && (
        <Stack spacing={3}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(5, minmax(0, 1fr))',
              },
              gap: { xs: 2, md: 2.5 },
            }}
          >
            <KpiCard
              label="Cotizaciones"
              value={k.quotesCount}
              caption={
                <>
                  <Money value={k.quotesAmount} /> cotizados
                </>
              }
              icon={<EditNoteIcon />}
              color={theme.palette.primary.main}
            />
            <KpiCard
              label="% Convertidas"
              value={k.quotesSent > 0 ? pct(k.conversionRate) : '—'}
              caption={`${k.quotesWon} aceptadas / convertidas de ${k.quotesSent} enviadas`}
              icon={<TaskAltIcon />}
              color={theme.palette.success.main}
            />
            <KpiCard
              label="Ventas del período"
              value={<Money value={k.salesAmount} />}
              caption={
                <>
                  {k.salesOrders} OP · ticket prom. <Money value={k.averageTicket} />
                </>
              }
              icon={<PaymentsIcon />}
              color={theme.palette.info.main}
            />
            <KpiCard
              label="Total cartera"
              value={<Money value={k.portfolioTotal} />}
              caption={`Saldo por cobrar a hoy · ${k.portfolioOrders} OP`}
              icon={<AccountBalanceWalletIcon />}
              color={theme.palette.error.main}
            />
            <KpiCard
              label="Clientes nuevos"
              value={k.newClients}
              caption="Con su primera OP en el período"
              icon={<PersonAddAlt1Icon />}
              color={theme.palette.warning.main}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>
            <SalesByStatusPanel rows={data.salesByStatus} />
            <AgingPanel buckets={data.portfolioAging} />
            <GoalPanel data={data} />
            <FunnelPanel {...data.quoteFunnel} />
          </Box>

          {!data.scopedToOwn && !data.advisorId && (
            <RankingPanel rows={data.advisorRanking} onSelect={setAdvisorId} />
          )}

          <TopDebtorsPanel rows={data.topDebtors} />
        </Stack>
      )}
    </Box>
  );
};

export default CommercialDashboardPage;
