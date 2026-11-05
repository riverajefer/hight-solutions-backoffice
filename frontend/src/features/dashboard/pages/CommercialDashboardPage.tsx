import React, { createContext, useContext, useMemo, useState } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  type Theme,
} from '@mui/material';
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import { PageHeader } from '../../../components/common/PageHeader';
import { dashboardApi } from '../../../api/dashboard.api';
import { formatCurrency } from '../../../utils/formatters';
import { neonAccents } from '../../../theme/colors';
import type {
  CommercialAdvisorRow,
  CommercialAgingBucket,
  CommercialDashboardResponse,
  CommercialFunnelStage,
  CommercialSalesByStatus,
  CommercialTopDebtor,
  CommercialTrendPoint,
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

/**
 * Tabla compacta. `size="small"` no basta: el tema fija `padding: 16px` en todas
 * las celdas (`MuiTableCell.root`) y eso pisa el padding reducido del modo
 * small. Las cifras no se parten en dos renglones: la tabla se desplaza de lado
 * si no cabe.
 */
const COMPACT_TABLE = {
  '& td, & th': { whiteSpace: 'nowrap', py: 0.75, px: 1.5, fontSize: '0.8125rem' },
  '& th': { fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', py: 1 },
  // La tabla se sale del padding del panel (mx negativo): primera y última
  // columna recuperan ese margen para alinearse con el título.
  '& td:first-of-type, & th:first-of-type': { pl: { xs: 2, md: 3 } },
  '& td:last-of-type, & th:last-of-type': { pr: { xs: 2, md: 3 } },
} as const;

// ---------------------------------------------------------------------------
// Filtros aplicados en cada tarjeta
// ---------------------------------------------------------------------------

interface AppliedFilters {
  /** «Este mes», «Últimos 30 días» o el rango personalizado. */
  period: string;
  /** Fechas exactas del periodo, para el tooltip de la etiqueta. */
  periodDates: string;
  /** «Todos», «Tus cifras» o el nombre corto de la asesora. */
  advisor: string;
  advisorFull: string;
  /** «Noviembre 2026»: la meta es mensual y no sigue el periodo. */
  goalMonth: string;
}

const FiltersContext = createContext<AppliedFilters | null>(null);

/**
 * Qué filtros afectan la cifra:
 * - `period`: el periodo elegido y la asesora.
 * - `today`: foto a hoy (cartera) — el periodo no la cambia, solo la asesora.
 * - `goal`: el mes de la meta y la asesora.
 * - `team`: el periodo, siempre para todo el equipo (ranking).
 * - `trend`: los últimos 12 meses y la asesora (evolución) — no sigue el periodo.
 */
type FilterScope = 'period' | 'today' | 'goal' | 'team' | 'trend';

const FilterChip: React.FC<{ icon: React.ReactElement; label: string; title: string }> = ({ icon, label, title }) => (
  <Tooltip title={title} arrow>
    <Chip
      size="small"
      variant="outlined"
      icon={icon}
      label={label}
      sx={{
        height: 22,
        maxWidth: 180,
        fontSize: '0.7rem',
        fontWeight: 600,
        color: 'text.secondary',
        borderColor: 'divider',
        '& .MuiChip-icon': { fontSize: 14, ml: 0.75, color: 'text.secondary' },
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  </Tooltip>
);

/** Etiquetas «Este mes · Nicole Dayanna» con los filtros que usa la tarjeta. */
const AppliedFilterChips: React.FC<{ scope: FilterScope; sx?: object }> = ({ scope, sx }) => {
  const f = useContext(FiltersContext);
  if (!f) return null;
  const time =
    scope === 'today'
      ? { label: 'A hoy', title: 'Saldo a hoy: no depende del periodo elegido' }
      : scope === 'goal'
        ? {
            label: f.goalMonth,
            title: 'La meta es mensual: se mide la del mes en curso o la del mes en que termina el periodo',
          }
        : scope === 'trend'
          ? {
              label: 'Últimos 12 meses',
              title: 'La evolución siempre muestra los últimos 12 meses: no depende del periodo',
            }
          : { label: f.period, title: `Periodo: ${f.periodDates}` };
  const advisor =
    scope === 'team'
      ? { label: 'Todos', title: 'El ranking siempre compara a todo el equipo' }
      : { label: f.advisor, title: `Asesora: ${f.advisorFull}` };
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, ...sx }}>
      <FilterChip icon={<CalendarMonthIcon />} label={time.label} title={time.title} />
      <FilterChip icon={<PersonIcon />} label={advisor.label} title={advisor.title} />
    </Stack>
  );
};

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  caption: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  scope: FilterScope;
}> = ({ label, value, caption, icon, color, scope }) => (
  <Card sx={{ p: 2.5, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 1,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.3 }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: alpha(color, 0.14),
          color,
          display: 'flex',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
    </Box>
    <Typography variant="h4" fontWeight={800} sx={{ mt: 1.5, ...tabular }}>
      {value}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
      {caption}
    </Typography>
    {/* mt: auto deja las etiquetas al pie, alineadas entre tarjetas de distinta altura. */}
    <AppliedFilterChips scope={scope} sx={{ mt: 'auto', pt: 1.5 }} />
  </Card>
);

const Panel: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  scope: FilterScope;
}> = ({ title, subtitle, children, action, scope }) => (
  <Card sx={{ p: { xs: 2, md: 3 }, minWidth: 0, height: '100%' }}>
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 1,
        mb: 2.5,
      }}
    >
      <Box>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        <AppliedFilterChips scope={scope} sx={{ mt: 1 }} />
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
interface HoverLine {
  label: string;
  value: React.ReactNode;
  /** Punto de color a la izquierda, para amarrar la línea con su parte de la barra. */
  color?: string;
  strong?: boolean;
}

/** Contenido del recuadro que aparece al pasar el mouse sobre una barra. */
const HoverDetail: React.FC<{
  title: string;
  lines: HoverLine[];
  note?: React.ReactNode;
}> = ({ title, lines, note }) => (
  <Box sx={{ minWidth: 220, py: 0.5 }}>
    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
      {title}
    </Typography>
    <Stack spacing={0.5}>
      {lines.map((l) => (
        <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {l.color && (
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '3px',
                bgcolor: l.color,
                flexShrink: 0,
              }}
            />
          )}
          <Typography variant="caption" sx={{ flex: 1, opacity: 0.85 }}>
            {l.label}
          </Typography>
          <Typography variant="caption" fontWeight={l.strong ? 800 : 600} sx={tabular}>
            {l.value}
          </Typography>
        </Box>
      ))}
    </Stack>
    {note && (
      <Typography
        variant="caption"
        component="div"
        sx={{
          mt: 1,
          pt: 0.75,
          borderTop: 1,
          borderColor: 'divider',
          opacity: 0.8,
        }}
      >
        {note}
      </Typography>
    )}
  </Box>
);

/** Tooltip de las gráficas: sigue el cursor y en celular se abre al tocar. */
const ChartTooltip: React.FC<{
  content?: React.ReactNode;
  children: React.ReactElement;
}> = ({ content, children }) =>
  content ? (
    <Tooltip
      title={content}
      followCursor
      enterTouchDelay={0}
      leaveTouchDelay={4000}
      slotProps={{
        tooltip: {
          sx: (theme) => ({
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: 1,
            borderColor: 'divider',
            boxShadow: theme.shadows[8],
            borderRadius: 2,
            p: 1.5,
            maxWidth: 320,
          }),
        },
      }}
    >
      {children}
    </Tooltip>
  ) : (
    children
  );

const BarRow: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  filled: number;
  secondary?: number;
  max: number;
  color: string;
  /** Detalle que se muestra al pasar el mouse sobre la fila. */
  hover?: React.ReactNode;
}> = ({ label, value, detail, filled, secondary = 0, max, color, hover }) => {
  const theme = useTheme();
  const w = (n: number) => (max > 0 ? `${Math.max(0, (n / max) * 100)}%` : '0%');
  return (
    <ChartTooltip content={hover}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr auto',
            sm: 'minmax(120px, 160px) 1fr minmax(84px, auto)',
          },
          gridTemplateAreas: {
            xs: '"label value" "bar bar"',
            sm: '"label bar value"',
          },
          alignItems: 'center',
          columnGap: 2,
          rowGap: 0.5,
          mx: -1,
          px: 1,
          py: 0.5,
          borderRadius: 1.5,
          cursor: hover ? 'default' : undefined,
          transition: 'background-color .15s ease',
          '&:hover': hover
            ? {
                bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.1 : 0.06),
                '& .bar-fill': { filter: 'brightness(1.12)' },
              }
            : undefined,
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
          <Box
            className="bar-fill"
            sx={{
              width: w(filled),
              bgcolor: color,
              transition: 'width .4s ease, filter .15s ease',
            }}
          />
          {secondary > 0 && (
            <Box
              className="bar-fill"
              sx={{
                width: w(secondary),
                bgcolor: alpha(color, 0.35),
                transition: 'width .4s ease, filter .15s ease',
              }}
            />
          )}
        </Box>
        <Typography variant="body2" fontWeight={800} sx={{ gridArea: 'value', textAlign: 'right', ...tabular }}>
          {value}
        </Typography>
      </Box>
    </ChartTooltip>
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
      scope="period"
      title="Ventas por estado"
      subtitle="OP del período. La parte sólida es lo cobrado; la clara, lo que falta por cobrar."
    >
      {total === 0 ? (
        <EmptyState>No hay órdenes de pedido en este período.</EmptyState>
      ) : (
        <Stack spacing={2}>
          {visible.map((r) => {
            const color = colors[r.key] ?? theme.palette.primary.main;
            const pending = r.amount - r.collected;
            return (
              <BarRow
                key={r.key}
                label={r.label}
                detail={`${r.orders} OP · ${r.amount > 0 ? pct(r.collected / r.amount) : '0 %'} cobrado`}
                value={compactCOP(r.amount)}
                filled={r.collected}
                secondary={pending}
                max={max}
                color={color}
                hover={
                  <HoverDetail
                    title={r.label}
                    lines={[
                      {
                        label: 'Venta',
                        value: formatCurrency(r.amount, 0),
                        strong: true,
                      },
                      {
                        label: `Cobrado (${r.amount > 0 ? pct(r.collected / r.amount) : '0 %'})`,
                        value: formatCurrency(r.collected, 0),
                        color,
                      },
                      {
                        label: `Por cobrar (${r.amount > 0 ? pct(pending / r.amount) : '0 %'})`,
                        value: formatCurrency(pending, 0),
                        color: alpha(color, 0.35),
                      },
                      { label: 'Órdenes de pedido', value: r.orders },
                      {
                        label: 'Valor promedio por OP',
                        value: formatCurrency(r.orders > 0 ? r.amount / r.orders : 0, 0),
                      },
                      {
                        label: 'Participación en el período',
                        value: pct(r.amount / total),
                      },
                    ]}
                    note={r.key === 'DRAFT' ? 'Los borradores no cuentan en «Ventas del período».' : undefined}
                  />
                }
              />
            );
          })}
        </Stack>
      )}
    </Panel>
  );
};

const AGING_NOTES: Record<CommercialAgingBucket['key'], string | undefined> = {
  '0-30': undefined,
  '31-60': 'Buen momento para un recordatorio de pago.',
  '61-90': 'Riesgo de volverse cartera difícil: conviene llamar al cliente.',
  '90+': 'Cartera de difícil cobro: es la primera que hay que gestionar.',
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
    <Panel scope="today" title="Cartera por edades" subtitle="Saldo pendiente a hoy, según la antigüedad de la OP.">
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
                value={compactCOP(b.balance)}
                filled={b.balance}
                max={max}
                color={colors[b.key]}
                hover={
                  <HoverDetail
                    title={`Cartera de ${b.label.toLowerCase()}`}
                    lines={[
                      {
                        label: 'Saldo por cobrar',
                        value: formatCurrency(b.balance, 0),
                        strong: true,
                        color: colors[b.key],
                      },
                      { label: 'OP con saldo', value: b.orders },
                      {
                        label: 'Saldo promedio por OP',
                        value: formatCurrency(b.orders > 0 ? b.balance / b.orders : 0, 0),
                      },
                      {
                        label: 'Parte de la cartera',
                        value: pct(b.balance / total),
                      },
                    ]}
                    note={AGING_NOTES[b.key]}
                  />
                }
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
  // Ritmo diario: solo tiene sentido si la meta es la del mes en curso.
  const today = new Date();
  const daysLeft =
    today.getFullYear() === goal.year && today.getMonth() + 1 === goal.month
      ? differenceInCalendarDays(endOfMonth(today), today) + 1
      : null;
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
      scope="goal"
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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 1.5,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="h3" fontWeight={800} sx={{ color, ...tabular }}>
              {pct(goal.progress)}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={tabular}>
              <Money value={goal.achieved} variant="full" /> de <Money value={goal.target} variant="full" />
            </Typography>
          </Box>
          <ChartTooltip
            content={
              <HoverDetail
                title={`Meta de ${monthLabel}`}
                lines={[
                  {
                    label: 'Meta',
                    value: formatCurrency(goal.target, 0),
                    strong: true,
                  },
                  {
                    label: `Logrado (${pct(goal.progress)})`,
                    value: formatCurrency(goal.achieved, 0),
                    color,
                  },
                  {
                    label: 'Falta',
                    value: formatCurrency(goal.remaining, 0),
                    color: alpha(color, 0.3),
                  },
                  ...(daysLeft !== null
                    ? [
                        { label: 'Días que quedan del mes', value: daysLeft },
                        ...(goal.remaining > 0
                          ? [
                              {
                                label: 'Hay que lograr por día',
                                value: formatCurrency(goal.remaining / daysLeft, 0),
                              },
                            ]
                          : []),
                      ]
                    : []),
                ]}
                note="Solo suma cuando la OP queda entregada y sin saldo."
              />
            }
          >
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
          </ChartTooltip>
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

const FUNNEL_STAGES: Array<{
  key: string;
  label: string;
  statuses: string[];
  tone: 'grey' | 'info' | 'warning' | 'success' | 'error';
}> = [
  { key: 'draft', label: 'Borrador', statuses: ['DRAFT'], tone: 'grey' },
  { key: 'sent', label: 'Enviadas', statuses: ['SENT'], tone: 'info' },
  {
    key: 'follow',
    label: 'En seguimiento',
    statuses: ['FOLLOW_UP_1', 'FOLLOW_UP_2', 'FOLLOW_UP_3'],
    tone: 'warning',
  },
  {
    key: 'won',
    label: 'Aceptadas / convertidas',
    statuses: ['ACCEPTED', 'CONVERTED'],
    tone: 'success',
  },
  {
    key: 'lost',
    label: 'Rechazadas / sin respuesta',
    statuses: ['REJECTED', 'NO_RESPONSE'],
    tone: 'error',
  },
];

const QUOTE_STATUS_LABELS: Record<string, string> = {
  FOLLOW_UP_1: 'Seguimiento 1',
  FOLLOW_UP_2: 'Seguimiento 2',
  FOLLOW_UP_3: 'Seguimiento 3',
  ACCEPTED: 'Aceptadas (sin OP aún)',
  CONVERTED: 'Convertidas en OP',
  REJECTED: 'Rechazadas',
  NO_RESPONSE: 'Sin respuesta',
};

const FUNNEL_NOTES: Record<string, string | undefined> = {
  draft: 'Aún no se envían al cliente: no cuentan para la conversión.',
  sent: 'Enviadas sin seguimiento todavía.',
  follow: 'Venta que todavía se puede ganar.',
  won: undefined,
  lost: undefined,
};

const FunnelPanel: React.FC<{
  stages: CommercialFunnelStage[];
  openAmount: number;
  openCount: number;
}> = ({ stages, openAmount, openCount }) => {
  const theme = useTheme();
  const byStatus = new Map(stages.map((s) => [s.status, s]));
  const rows = FUNNEL_STAGES.map((stage) =>
    stage.statuses.reduce(
      (t, s) => ({
        ...t,
        count: t.count + (byStatus.get(s)?.count ?? 0),
        amount: t.amount + (byStatus.get(s)?.amount ?? 0),
      }),
      { ...stage, count: 0, amount: 0 },
    ),
  );
  const max = Math.max(...rows.map((r) => r.count), 0);
  const totalCount = rows.reduce((t, r) => t + r.count, 0);
  const toneColor = (tone: (typeof FUNNEL_STAGES)[number]['tone']) =>
    tone === 'grey' ? theme.palette.grey[500] : theme.palette[tone].main;

  return (
    <Panel
      scope="period"
      title="Embudo de cotizaciones"
      subtitle="Cotizaciones del período según su estado actual."
      action={
        openCount > 0 ? (
          <Tooltip title="Cotizaciones enviadas o en seguimiento: es la venta que todavía se puede ganar." arrow>
            <Chip
              color="warning"
              variant="outlined"
              label={`${compactCOP(openAmount)} en juego`}
              sx={{ fontWeight: 700 }}
            />
          </Tooltip>
        ) : undefined
      }
    >
      {max === 0 ? (
        <EmptyState>No hay cotizaciones en este período.</EmptyState>
      ) : (
        <Stack spacing={2}>
          {rows.map((r) => {
            const color = toneColor(r.tone);
            const breakdown =
              r.statuses.length > 1
                ? r.statuses.map((s) => ({
                    label: QUOTE_STATUS_LABELS[s] ?? s,
                    value: `${byStatus.get(s)?.count ?? 0} · ${formatCurrency(byStatus.get(s)?.amount ?? 0, 0)}`,
                  }))
                : [];
            return (
              <BarRow
                key={r.key}
                label={r.label}
                detail={formatCurrency(r.amount, 0)}
                value={r.count}
                filled={r.count}
                max={max}
                color={color}
                hover={
                  <HoverDetail
                    title={r.label}
                    lines={[
                      {
                        label: 'Cotizaciones',
                        value: r.count,
                        strong: true,
                        color,
                      },
                      {
                        label: 'Valor cotizado',
                        value: formatCurrency(r.amount, 0),
                      },
                      {
                        label: 'Valor promedio',
                        value: formatCurrency(r.count > 0 ? r.amount / r.count : 0, 0),
                      },
                      {
                        label: 'Parte del total',
                        value: totalCount > 0 ? pct(r.count / totalCount) : '0 %',
                      },
                      ...breakdown,
                    ]}
                    note={FUNNEL_NOTES[r.key]}
                  />
                }
              />
            );
          })}
        </Stack>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------------------
// Gráficas de columnas (recharts)
// ---------------------------------------------------------------------------

/** "BERGY ANAYA POLANCO" → "Bergy Anaya": el eje no tiene espacio para nombres completos. */
const shortName = (name: string, words = 2) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, words)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Mismo recuadro que las barras horizontales, para el tooltip de recharts. */
const ChartHoverBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={(theme) => ({
      bgcolor: 'background.paper',
      color: 'text.primary',
      border: 1,
      borderColor: 'divider',
      boxShadow: theme.shadows[8],
      borderRadius: 2,
      p: 1.5,
    })}
  >
    {children}
  </Box>
);

const useAxisStyle = () => {
  const theme = useTheme();
  return {
    tick: { fill: theme.palette.text.secondary, fontSize: 12 },
    grid: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.08),
    cursor: { fill: alpha(theme.palette.text.primary, 0.05) },
  };
};

type RankingMetric = 'sales' | 'portfolio' | 'conversion' | 'newClients';

const RANKING_METRICS: Record<RankingMetric, string> = {
  sales: 'Venta',
  portfolio: 'Cartera',
  conversion: 'Conversión',
  newClients: 'Clientes nuevos',
};

const AdvisorRankingChart: React.FC<{
  rows: CommercialAdvisorRow[];
  onSelect: (id: string) => void;
}> = ({ rows, onSelect }) => {
  const theme = useTheme();
  const axis = useAxisStyle();
  const [metric, setMetric] = useState<RankingMetric>('sales');

  // Se ordena por la métrica elegida: una gráfica de columnas se lee de mayor a menor.
  const data = useMemo(() => {
    const valueOf = (r: CommercialAdvisorRow) =>
      metric === 'sales'
        ? r.salesAmount
        : metric === 'portfolio'
          ? r.portfolio
          : metric === 'conversion'
            ? r.conversionRate * 100
            : r.newClients;
    return rows
      .map((r) => ({
        ...r,
        short: shortName(r.advisorName),
        value: valueOf(r),
        portfolioRecent: Math.max(0, r.portfolio - r.portfolioOver90),
      }))
      .sort((a, b) => b.value - a.value);
  }, [rows, metric]);

  const formatValue = (v: number) =>
    metric === 'conversion' ? `${Math.round(v)} %` : metric === 'newClients' ? String(v) : compactCOP(v);

  const barColor =
    metric === 'sales'
      ? theme.palette.primary.main
      : metric === 'conversion'
        ? theme.palette.success.main
        : theme.palette.warning.main;

  return (
    <Box sx={{ mb: 3 }}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={metric}
        onChange={(_, v: RankingMetric | null) => v && setMetric(v)}
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        {(Object.keys(RANKING_METRICS) as RankingMetric[]).map((m) => (
          <ToggleButton key={m} value={m} sx={{ textTransform: 'none', px: 1.5 }}>
            {RANKING_METRICS[m]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box sx={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={axis.grid} vertical={false} />
            <XAxis
              dataKey="short"
              tick={axis.tick}
              interval={0}
              angle={data.length > 5 ? -30 : 0}
              textAnchor={data.length > 5 ? 'end' : 'middle'}
              height={data.length > 5 ? 70 : 30}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={axis.tick}
              tickFormatter={formatValue}
              width={72}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <RechartsTooltip
              cursor={axis.cursor}
              content={({ active, payload }) => {
                const r = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : undefined;
                if (!r) return null;
                return (
                  <ChartHoverBox>
                    <HoverDetail
                      title={r.advisorName}
                      lines={[
                        {
                          label: 'Venta',
                          value: formatCurrency(r.salesAmount, 0),
                          strong: metric === 'sales',
                        },
                        { label: 'OP', value: r.salesOrders },
                        {
                          label: 'Ticket promedio',
                          value: formatCurrency(r.averageTicket, 0),
                        },
                        { label: 'Cotizaciones', value: r.quotes },
                        {
                          label: 'Conversión',
                          value: r.quotes > 0 ? pct(r.conversionRate) : '—',
                          strong: metric === 'conversion',
                        },
                        {
                          label: 'Clientes nuevos',
                          value: r.newClients,
                          strong: metric === 'newClients',
                        },
                        {
                          label: 'Cartera',
                          value: formatCurrency(r.portfolio, 0),
                          strong: metric === 'portfolio',
                        },
                        {
                          label: 'Cartera +90 días',
                          value: formatCurrency(r.portfolioOver90, 0),
                        },
                        {
                          label: 'Meta',
                          value: r.goalProgress === null ? 'Sin meta' : pct(r.goalProgress),
                        },
                      ]}
                      note="Haz clic en la columna para ver solo sus cifras."
                    />
                  </ChartHoverBox>
                );
              }}
            />
            {metric === 'portfolio' ? (
              <>
                <Bar
                  dataKey="portfolioRecent"
                  name="Hasta 90 días"
                  stackId="p"
                  fill={theme.palette.warning.main}
                  cursor="pointer"
                  onClick={(d: { payload?: { advisorId: string } }) => d.payload && onSelect(d.payload.advisorId)}
                />
                <Bar
                  dataKey="portfolioOver90"
                  name="Más de 90 días"
                  stackId="p"
                  fill={theme.palette.error.main}
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(d: { payload?: { advisorId: string } }) => d.payload && onSelect(d.payload.advisorId)}
                />
              </>
            ) : (
              <Bar
                dataKey="value"
                name={RANKING_METRICS[metric]}
                fill={barColor}
                radius={[6, 6, 0, 0]}
                maxBarSize={56}
                cursor="pointer"
                onClick={(d: { payload?: { advisorId: string } }) => d.payload && onSelect(d.payload.advisorId)}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </Box>
      {metric === 'portfolio' && (
        <Stack direction="row" spacing={2} sx={{ mt: 1, justifyContent: 'center' }}>
          {[
            { label: 'Hasta 90 días', color: theme.palette.warning.main },
            { label: 'Más de 90 días', color: theme.palette.error.main },
          ].map((l) => (
            <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '3px',
                  bgcolor: l.color,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {l.label}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

/** Color por la OP más vieja del cliente: la misma escala que la cartera por edades. */
const debtAgeColor = (theme: Theme, days: number) =>
  days > 90
    ? theme.palette.error.main
    : days > 60
      ? theme.palette.error.light
      : days > 30
        ? theme.palette.warning.main
        : theme.palette.info.main;

const TopDebtorsChart: React.FC<{ rows: CommercialTopDebtor[] }> = ({ rows }) => {
  const theme = useTheme();
  const axis = useAxisStyle();
  const navigate = useNavigate();
  const today = new Date();
  const data = rows.map((r) => {
    const days = differenceInCalendarDays(today, parseISO(r.oldestOrderDate));
    return {
      ...r,
      days,
      short: truncate(r.clientName, 16),
      color: debtAgeColor(theme, days),
    };
  });

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={axis.grid} vertical={false} />
            <XAxis
              dataKey="short"
              tick={axis.tick}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={80}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={axis.tick} tickFormatter={compactCOP} width={72} tickLine={false} axisLine={false} />
            <RechartsTooltip
              cursor={axis.cursor}
              content={({ active, payload }) => {
                const r = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : undefined;
                if (!r) return null;
                return (
                  <ChartHoverBox>
                    <HoverDetail
                      title={r.clientName}
                      lines={[
                        {
                          label: 'Saldo por cobrar',
                          value: formatCurrency(r.balance, 0),
                          strong: true,
                          color: r.color,
                        },
                        { label: 'OP con saldo', value: r.orders },
                        {
                          label: 'Saldo promedio por OP',
                          value: formatCurrency(r.orders > 0 ? r.balance / r.orders : 0, 0),
                        },
                        {
                          label: 'OP más antigua',
                          value: `${format(parseISO(r.oldestOrderDate), 'd MMM yyyy', { locale: es })} · ${r.days} días`,
                        },
                      ]}
                      note="Haz clic en la columna para abrir la ficha del cliente."
                    />
                  </ChartHoverBox>
                );
              }}
            />
            <Bar
              dataKey="balance"
              name="Saldo"
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
              cursor="pointer"
              onClick={(d: { payload?: { clientId: string } }) =>
                d.payload && navigate(`/clients/${d.payload.clientId}`)
              }
            >
              {data.map((d) => (
                <Cell key={d.clientId} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
      <Stack direction="row" spacing={2} sx={{ mt: 1, justifyContent: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
        {[
          { label: 'OP más vieja ≤ 30 d', days: 0 },
          { label: '31–60 d', days: 45 },
          { label: '61–90 d', days: 75 },
          { label: '+90 d', days: 120 },
        ].map((l) => (
          <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '3px',
                bgcolor: debtAgeColor(theme, l.days),
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {l.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

/** «2026-11» → «Nov 26» para el eje; «noviembre 2026» para el detalle. */
const monthTick = (ym: string) => {
  const label = format(parseISO(`${ym}-01`), 'MMM yy', { locale: es }).replace('.', '');
  return label.charAt(0).toUpperCase() + label.slice(1);
};
const monthLong = (ym: string) => format(parseISO(`${ym}-01`), "MMMM 'de' yyyy", { locale: es });

const TrendPanel: React.FC<{ points: CommercialTrendPoint[] }> = ({ points }) => {
  const theme = useTheme();
  const axis = useAxisStyle();
  const series = [
    // primary, info y success son casi el mismo cian en este tema: tres curvas
    // superpuestas se confundían. Se toman tonos de la paleta que sí contrastan.
    { key: 'quoted', label: 'Cotizado', color: neonAccents.vividPurple },
    { key: 'sold', label: 'Vendido', color: theme.palette.primary.main },
    { key: 'collected', label: 'Cobrado', color: theme.palette.success.dark },
  ] as const;
  const goalColor = theme.palette.warning.main;
  const hasGoal = points.some((p) => p.goal !== null);
  const data = points.map((p) => ({ ...p, tick: monthTick(p.month) }));
  const current = data.find((p) => p.inProgress);
  const empty = points.every((p) => p.quoted === 0 && p.sold === 0 && p.collected === 0);

  return (
    <Panel
      scope="trend"
      title="Evolución comercial"
      subtitle="Lo que se cotiza, lo que se vende y lo que se cobra cada mes. Si se abre la brecha entre cotizado y vendido, baja la conversión; si se abre entre vendido y cobrado, crece la cartera."
    >
      {empty ? (
        <EmptyState>Todavía no hay movimiento para mostrar.</EmptyState>
      ) : (
        <>
          <Box sx={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 0 }}>
                <defs>
                  {series.map((s) => (
                    <linearGradient key={s.key} id={`trend-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={axis.grid} vertical={false} />
                <XAxis dataKey="tick" tick={axis.tick} tickLine={false} axisLine={false} />
                <YAxis tick={axis.tick} tickFormatter={compactCOP} width={72} tickLine={false} axisLine={false} />
                {current && (
                  <ReferenceLine
                    x={current.tick}
                    stroke={theme.palette.text.secondary}
                    strokeDasharray="4 4"
                    label={{
                      value: 'En curso',
                      position: 'insideTopRight',
                      fill: theme.palette.text.secondary,
                      fontSize: 11,
                    }}
                  />
                )}
                <RechartsTooltip
                  cursor={{ stroke: alpha(theme.palette.text.primary, 0.2) }}
                  content={({ active, payload }) => {
                    const p = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : undefined;
                    if (!p) return null;
                    const title = monthLong(p.month);
                    return (
                      <ChartHoverBox>
                        <HoverDetail
                          title={title.charAt(0).toUpperCase() + title.slice(1)}
                          lines={[
                            ...series.map((s) => ({
                              label: s.label,
                              value: formatCurrency(p[s.key], 0),
                              color: s.color,
                            })),
                            {
                              label: 'Meta',
                              value: p.goal === null ? 'Sin meta' : formatCurrency(p.goal, 0),
                              color: goalColor,
                            },
                            ...(p.goal
                              ? [{ label: 'Vendido vs. meta', value: pct(p.sold / p.goal), strong: true }]
                              : []),
                            ...(p.sold > 0 ? [{ label: 'Cobrado vs. vendido', value: pct(p.collected / p.sold) }] : []),
                          ]}
                          note={
                            p.inProgress
                              ? 'Mes en curso: sus cifras siguen sumando hasta que termine.'
                              : 'Lo cobrado incluye abonos a OP de meses anteriores.'
                          }
                        />
                      </ChartHoverBox>
                    );
                  }}
                />
                {series.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2.5}
                    fill={`url(#trend-${s.key})`}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
                {hasGoal && (
                  <Line
                    type="monotone"
                    dataKey="goal"
                    name="Meta"
                    stroke={goalColor}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={{ r: 3, fill: goalColor }}
                    connectNulls={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
          <Stack
            direction="row"
            spacing={2.5}
            sx={{ mt: 1.5, justifyContent: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
          >
            {[
              ...series.map((s) => ({ label: s.label, color: s.color, dashed: false })),
              ...(hasGoal ? [{ label: 'Meta', color: goalColor, dashed: true }] : []),
            ].map((l) => (
              <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box
                  sx={{
                    width: 14,
                    height: 0,
                    borderTop: `3px ${l.dashed ? 'dashed' : 'solid'} ${l.color}`,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {l.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </>
      )}
    </Panel>
  );
};

const ClientTypePanel: React.FC<{ points: CommercialTrendPoint[] }> = ({ points }) => {
  const theme = useTheme();
  const axis = useAxisStyle();
  const newColor = theme.palette.warning.main; // mismo color que la tarjeta «Clientes nuevos»
  const recurringColor = theme.palette.primary.main;
  const shareColor = neonAccents.vividPurple;
  const data = points.map((p) => {
    const total = p.newClientSales + p.recurringClientSales;
    return {
      ...p,
      tick: monthTick(p.month),
      // null y no 0: un mes sin venta no tiene porcentaje, la línea se corta.
      recurringShare: total > 0 ? (p.recurringClientSales / total) * 100 : null,
    };
  });
  const current = data.find((p) => p.inProgress);
  const empty = points.every((p) => p.newClientSales === 0 && p.recurringClientSales === 0);

  return (
    <Panel
      scope="trend"
      title="Clientes nuevos vs. recurrentes"
      subtitle="Venta de cada mes según si el cliente compraba por primera vez o ya había comprado antes. Si la parte recurrente cae, se están perdiendo clientes."
    >
      {empty ? (
        <EmptyState>Todavía no hay ventas para mostrar.</EmptyState>
      ) : (
        <>
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={axis.grid} vertical={false} />
                <XAxis dataKey="tick" tick={axis.tick} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="money"
                  tick={axis.tick}
                  tickFormatter={compactCOP}
                  width={72}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="share"
                  orientation="right"
                  domain={[0, 100]}
                  tick={axis.tick}
                  tickFormatter={(v: number) => `${v} %`}
                  width={48}
                  tickLine={false}
                  axisLine={false}
                />
                {current && (
                  <ReferenceLine
                    yAxisId="money"
                    x={current.tick}
                    stroke={theme.palette.text.secondary}
                    strokeDasharray="4 4"
                    label={{
                      value: 'En curso',
                      position: 'insideTopRight',
                      fill: theme.palette.text.secondary,
                      fontSize: 11,
                    }}
                  />
                )}
                <RechartsTooltip
                  cursor={axis.cursor}
                  content={({ active, payload }) => {
                    const p = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : undefined;
                    if (!p) return null;
                    const title = monthLong(p.month);
                    const clients = p.newClients + p.recurringClients;
                    return (
                      <ChartHoverBox>
                        <HoverDetail
                          title={title.charAt(0).toUpperCase() + title.slice(1)}
                          lines={[
                            {
                              label: `Clientes nuevos (${p.newClients})`,
                              value: formatCurrency(p.newClientSales, 0),
                              color: newColor,
                            },
                            {
                              label: `Clientes recurrentes (${p.recurringClients})`,
                              value: formatCurrency(p.recurringClientSales, 0),
                              color: recurringColor,
                            },
                            {
                              label: 'Venta de recurrentes',
                              value: p.recurringShare === null ? '—' : `${Math.round(p.recurringShare)} %`,
                              color: shareColor,
                              strong: true,
                            },
                            ...(p.newClients > 0
                              ? [
                                  {
                                    label: 'Compra promedio de un cliente nuevo',
                                    value: formatCurrency(p.newClientSales / p.newClients, 0),
                                  },
                                ]
                              : []),
                            ...(p.recurringClients > 0
                              ? [
                                  {
                                    label: 'Compra promedio de un recurrente',
                                    value: formatCurrency(p.recurringClientSales / p.recurringClients, 0),
                                  },
                                ]
                              : []),
                            ...(clients > 0 ? [{ label: 'Clientes que compraron', value: clients }] : []),
                          ]}
                          note={
                            p.inProgress
                              ? 'Mes en curso: sus cifras siguen sumando hasta que termine.'
                              : 'Nuevo = su primera OP en el sistema fue de este mes.'
                          }
                        />
                      </ChartHoverBox>
                    );
                  }}
                />
                <Bar
                  yAxisId="money"
                  dataKey="recurringClientSales"
                  name="Recurrentes"
                  stackId="c"
                  fill={recurringColor}
                  maxBarSize={56}
                />
                <Bar
                  yAxisId="money"
                  dataKey="newClientSales"
                  name="Nuevos"
                  stackId="c"
                  fill={newColor}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={56}
                />
                <Line
                  yAxisId="share"
                  type="monotone"
                  dataKey="recurringShare"
                  name="% recurrente"
                  stroke={shareColor}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: shareColor }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
          <Stack
            direction="row"
            spacing={2.5}
            sx={{ mt: 1.5, justifyContent: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
          >
            {[
              { label: 'Venta a recurrentes', color: recurringColor, line: false },
              { label: 'Venta a nuevos', color: newColor, line: false },
              { label: '% de la venta que es recurrente (eje derecho)', color: shareColor, line: true },
            ].map((l) => (
              <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box
                  sx={
                    l.line
                      ? { width: 14, height: 0, borderTop: `3px solid ${l.color}` }
                      : { width: 10, height: 10, borderRadius: '3px', bgcolor: l.color }
                  }
                />
                <Typography variant="caption" color="text.secondary">
                  {l.label}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5, textAlign: 'center' }}>
            En los primeros meses de uso del sistema casi todos los clientes aparecen como nuevos: ahí registraron su
            primera OP, aunque ya compraban antes.
          </Typography>
        </>
      )}
    </Panel>
  );
};

const RankingPanel: React.FC<{
  rows: CommercialAdvisorRow[];
  onSelect: (id: string) => void;
}> = ({ rows, onSelect }) => (
  <Panel
    scope="team"
    title="Ranking de asesoras"
    subtitle="Haz clic en una columna o en un nombre para ver solo sus cifras."
  >
    {rows.length === 0 ? (
      <EmptyState>Nadie vendió ni cotizó en este período.</EmptyState>
    ) : (
      <>
        <AdvisorRankingChart rows={rows} onSelect={onSelect} />
        <TableContainer sx={{ mx: { xs: -2, md: -3 }, width: 'auto' }}>
          <Table size="small" sx={COMPACT_TABLE}>
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
                    <Link
                      component="button"
                      variant="body2"
                      fontWeight={600}
                      underline="hover"
                      onClick={() => onSelect(r.advisorId)}
                    >
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
                  <TableCell
                    align="right"
                    sx={{
                      ...tabular,
                      color: r.portfolioOver90 > 0 ? 'error.main' : 'text.secondary',
                    }}
                  >
                    {r.portfolioOver90 > 0 ? <Money value={r.portfolioOver90} /> : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ pr: { xs: 2, md: 3 } }}>
                    {r.goalProgress === null ? (
                      <Typography variant="caption" color="text.secondary">
                        Sin meta
                      </Typography>
                    ) : (
                      <ChartTooltip
                        content={
                          <HoverDetail
                            title={`Meta de ${r.advisorName}`}
                            lines={[
                              {
                                label: 'Meta del mes',
                                value: formatCurrency(r.goalTarget ?? 0, 0),
                                strong: true,
                              },
                              {
                                label: `Logrado (${pct(r.goalProgress)})`,
                                value: formatCurrency((r.goalTarget ?? 0) * r.goalProgress, 0),
                              },
                              {
                                label: 'Falta',
                                value: formatCurrency(Math.max(0, (r.goalTarget ?? 0) * (1 - r.goalProgress)), 0),
                              },
                            ]}
                          />
                        }
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            justifyContent: 'flex-end',
                          }}
                        >
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
                      </ChartTooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    )}
  </Panel>
);

const TopDebtorsPanel: React.FC<{ rows: CommercialTopDebtor[] }> = ({ rows }) => {
  const today = new Date();
  return (
    <Panel scope="today" title="Clientes con más cartera" subtitle="Los 10 clientes que más deben a hoy.">
      {rows.length === 0 ? (
        <EmptyState>No hay clientes con saldo pendiente.</EmptyState>
      ) : (
        <>
          <TopDebtorsChart rows={rows} />
          <TableContainer sx={{ mx: { xs: -2, md: -3 }, width: 'auto' }}>
            <Table size="small" sx={COMPACT_TABLE}>
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
                        <Link
                          component={RouterLink}
                          to={`/clients/${r.clientId}`}
                          underline="hover"
                          fontWeight={600}
                          noWrap
                          sx={{ display: 'block' }}
                        >
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
        </>
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
      dashboardApi.getCommercial({
        dateFrom: range.from,
        dateTo: range.to,
        advisorId: advisorId || undefined,
      }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
  });

  const advisorName = data?.advisors.find((a) => a.id === advisorId)?.name;
  const scopeLabel = data?.scopedToOwn ? 'Tus cifras' : advisorName ? `Asesora: ${advisorName}` : 'Todo el equipo';

  const appliedFilters = useMemo<AppliedFilters | null>(() => {
    if (!data) return null;
    const dates = `${format(parseISO(range.from), 'd MMM yyyy', { locale: es })} – ${format(parseISO(range.to), 'd MMM yyyy', { locale: es })}`;
    const goalMonth = format(new Date(data.goal.year, data.goal.month - 1, 1), 'MMMM yyyy', { locale: es });
    return {
      period:
        preset === 'custom'
          ? `${format(parseISO(range.from), 'd MMM', { locale: es })} – ${format(parseISO(range.to), 'd MMM', { locale: es })}`
          : PERIOD_LABELS[preset],
      periodDates: dates,
      advisor: data.scopedToOwn ? 'Tus cifras' : advisorName ? shortName(advisorName) : 'Todos',
      advisorFull: data.scopedToOwn ? 'solo tus cifras' : (advisorName ?? 'todo el equipo'),
      goalMonth: `Meta ${goalMonth.charAt(0).toUpperCase()}${goalMonth.slice(1)}`,
    };
  }, [data, preset, range, advisorName]);

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
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
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

      {isError && !data && (
        <Alert severity="error">No se pudo cargar el tablero comercial. Intenta de nuevo en unos segundos.</Alert>
      )}

      {data && k && (
        <FiltersContext.Provider value={appliedFilters}>
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
                scope="period"
              />
              <KpiCard
                label="% Convertidas"
                value={k.quotesSent > 0 ? pct(k.conversionRate) : '—'}
                caption={`${k.quotesWon} aceptadas / convertidas de ${k.quotesSent} enviadas`}
                icon={<TaskAltIcon />}
                color={theme.palette.success.main}
                scope="period"
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
                scope="period"
              />
              <KpiCard
                label="Total cartera"
                value={<Money value={k.portfolioTotal} />}
                caption={`Saldo por cobrar a hoy · ${k.portfolioOrders} OP`}
                icon={<AccountBalanceWalletIcon />}
                color={theme.palette.error.main}
                scope="today"
              />
              <KpiCard
                label="Clientes nuevos"
                value={k.newClients}
                caption="Con su primera OP en el período"
                icon={<PersonAddAlt1Icon />}
                color={theme.palette.warning.main}
                scope="period"
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  lg: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 3,
              }}
            >
              <SalesByStatusPanel rows={data.salesByStatus} />
              <AgingPanel buckets={data.portfolioAging} />
              <GoalPanel data={data} />
              <FunnelPanel {...data.quoteFunnel} />
            </Box>

            <TrendPanel points={data.monthlyTrend} />

            <ClientTypePanel points={data.monthlyTrend} />

            {!data.scopedToOwn && !data.advisorId && (
              <RankingPanel rows={data.advisorRanking} onSelect={setAdvisorId} />
            )}

            <TopDebtorsPanel rows={data.topDebtors} />
          </Stack>
        </FiltersContext.Provider>
      )}
    </Box>
  );
};

export default CommercialDashboardPage;
