import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  MenuItem,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  FactCheck as TrackingIcon,
  FileDownload as DownloadIcon,
  LocalShipping as DeliveredIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { useAdvisorTracking } from '../hooks';
import {
  DELIVERED_STATUSES,
  MONTHS,
  PAID_MODE_LABEL,
  STATUS_COLUMNS,
  buildPivot,
  pivotTotals,
  statusLabel,
  type Measure,
  type PaidMode,
} from '../utils/orderTrackingPivot';
import { exportOrderTrackingToExcel } from '../utils/exportOrderTracking';
import type { AdvisorTrackingRow, FilterOrdersDto, OrderStatus } from '../../../types/order.types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
  return value < 0 ? `−${formatted}` : formatted;
};

/**
 * Dentro de la matriz el símbolo va pegado al número: con nueve columnas de
 * moneda, el espacio que mete `Intl` cuesta ancho real antes del scroll.
 */
const formatCompactCurrency = (value: number) =>
  // `Intl` separa el símbolo con espacio duro ( ), no con uno normal.
  formatCurrency(value).replace(/\$[\s ]+/, '$');

/**
 * Los nombres completos ocupan casi un tercio del ancho de la tabla. Dejamos el
 * primer nombre y el primer apellido; el nombre entero queda en el tooltip.
 */
const shortAdvisorName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return `${parts[0]} ${parts[parts.length - 2]}`;
};

/** Densidad de la tabla: celdas y encabezados apretados para ver más columnas. */
const DENSE_CELL = { px: 1, py: 0.5, fontSize: '0.78rem' } as const;
const DENSE_HEAD = { px: 1, py: 0.75, lineHeight: 1.2 } as const;

/**
 * El tema define la tipografía del encabezado con un selector descendiente
 * (`& .MuiTableCell-head`), más específico que el `sx` de cada celda: para
 * achicarla hay que atacarla desde la tabla. Con doce columnas, el tamaño y el
 * `letterSpacing` heredados cuestan ancho real antes del scroll.
 */
const DENSE_TABLE = {
  minWidth: 720,
  '& .MuiTableCell-head': {
    fontSize: '0.62rem',
    letterSpacing: '0.02em',
  },
} as const;

/**
 * La columna de asesor queda fija: al desplazarse a la derecha para ver Total o
 * Brecha, seguir viendo de quién es la fila es lo que hace legible la matriz.
 */
const STICKY_COL = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  bgcolor: 'background.paper',
  whiteSpace: 'nowrap',
} as const;

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1];

// ─── componente ───────────────────────────────────────────────────────────────

export const OrderTrackingSection: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [measure, setMeasure] = useState<Measure>('count');
  const [paidMode, setPaidMode] = useState<PaidMode>('all');

  const trackingQuery = useAdvisorTracking({ month, year });
  const rows = useMemo(() => trackingQuery.data?.rows ?? [], [trackingQuery.data]);
  const scopedToOwn = trackingQuery.data?.scopedToOwn ?? false;
  const canSeeAll = hasPermission(PERMISSIONS.READ_ALL_ADVISORS_TRACKING);

  const isCount = measure === 'count';
  const format = (v: number) => (isCount ? String(v) : formatCompactCurrency(v));

  const pivot = useMemo(() => buildPivot(rows, measure, paidMode), [rows, measure, paidMode]);

  const totals = pivotTotals(pivot);
  const grandTotal = totals.reduce((a, b) => a + b, 0);
  const gapCount = pivot.reduce((acc, r) => acc + r.gapCount, 0);
  const gapAmount = pivot.reduce((acc, r) => acc + r.gapAmount, 0);

  // KPIs — siempre sobre el mes completo, sin importar el corte activo.
  const sum = (
    filter: (r: AdvisorTrackingRow) => boolean,
    key: keyof Pick<AdvisorTrackingRow, 'count' | 'netAmount' | 'pendingBalance'>,
  ) => rows.filter(filter).reduce((acc, r) => acc + r[key], 0);

  const totalOrders = sum(() => true, 'count');
  const totalNet = sum(() => true, 'netAmount');
  const paidOrders = sum((r) => r.paid, 'count');
  const paidNet = sum((r) => r.paid, 'netAmount');
  const dueOrders = sum((r) => !r.paid, 'count');
  const dueBalance = sum((r) => !r.paid, 'pendingBalance');
  const commissionable = (r: AdvisorTrackingRow) => r.paid && DELIVERED_STATUSES.includes(r.status);
  const commissionableOrders = sum(commissionable, 'count');
  const commissionableNet = sum(commissionable, 'netAmount');

  /** Abre el listado de Órdenes acotado a lo que representa la celda. */
  const openOrders = (extra: Partial<FilterOrdersDto>) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const orderFilters: FilterOrdersDto = {
      orderDateFrom: `${year}-${pad(month)}-01`,
      orderDateTo: `${year}-${pad(month)}-${pad(lastDay)}`,
      ...extra,
    };
    navigate(ROUTES.ORDERS, { state: { orderFilters } });
  };

  const cellFilters = (advisorId?: string, status?: OrderStatus): Partial<FilterOrdersDto> => ({
    ...(advisorId ? { createdById: advisorId } : {}),
    ...(status ? { status } : {}),
    ...(paidMode === 'all' ? {} : { paymentStatus: paidMode === 'due' ? 'PENDING' : 'PAID' }),
  });

  /**
   * Antes de navegar, decir en palabras qué recorte representa la celda y a
   * dónde lleva. Una matriz de doce columnas con dos toggles encima es fácil de
   * leer mal, y el clic saca al usuario de la pantalla.
   */
  const cellTooltip = (statusIndex: number, advisorName?: string) => {
    return (
      <Box sx={{ py: 0.5 }}>
        <Typography variant="caption" display="block" fontWeight={700}>
          {advisorName ?? 'Todos los asesores'} · {statusLabel(statusIndex)}
        </Typography>
        <Typography variant="caption" display="block">
          {MONTHS[month - 1]} {year} · {PAID_MODE_LABEL[paidMode]}
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 0.75, opacity: 0.85 }}>
          Abre el listado de Órdenes con este filtro aplicado.
        </Typography>
      </Box>
    );
  };

  /** Filtro de la columna «Brecha»: pagadas al 100% y todavía sin marcar entrega. */
  const gapFilters = (advisorId?: string): Partial<FilterOrdersDto> => ({
    ...(advisorId ? { createdById: advisorId } : {}),
    paymentStatus: 'PAID',
    deliveryStatus: 'PENDING',
  });

  const gapTooltip = (advisorName?: string) => (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="caption" display="block" fontWeight={700}>
        {advisorName ?? 'Todos los asesores'} · brecha de entrega
      </Typography>
      <Typography variant="caption" display="block">
        {MONTHS[month - 1]} {year} · pagadas al 100% y aún sin marcar como entregadas
      </Typography>
      <Typography variant="caption" display="block" sx={{ mt: 0.75, opacity: 0.85 }}>
        Abre el listado de Órdenes para marcar las entregas pendientes.
      </Typography>
    </Box>
  );

  const isLoading = trackingQuery.isLoading;
  const canExport = hasPermission(PERMISSIONS.EXPORT_SALES_BY_ADVISOR);

  const handleExport = () =>
    exportOrderTrackingToExcel({ rows, month, year, paidMode, scopedToOwn });

  return (
    <Box>
      <Card variant="outlined">
        <CardHeader
          avatar={<TrackingIcon color="primary" />}
          title={
            <Typography variant="h6" fontWeight={700}>
              Seguimiento de OP
            </Typography>
          }
          subheader="En qué estado va cada pedido del mes y cuáles ya están pagados"
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pr: 1, flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                sx={{ width: 130 }}
              >
                {MONTHS.map((m, i) => (
                  <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                sx={{ width: 90 }}
              >
                {YEAR_OPTIONS.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
              {canExport && (
                <Tooltip title="Descarga la matriz completa: una hoja de resumen y una por cada medida.">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<DownloadIcon />}
                      disabled={isLoading || rows.length === 0}
                      onClick={handleExport}
                    >
                      Excel
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Box>
          }
        />
        <Divider />
        <CardContent>
          {/* Controles */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Mido
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={measure}
                onChange={(_, v) => v && setMeasure(v)}
              >
                <ToggleButton value="count">N.º de OP</ToggleButton>
                <ToggleButton value="amount">Monto neto</ToggleButton>
                <ToggleButton value="balance">Saldo pendiente</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Incluyo
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={paidMode}
                onChange={(_, v) => v && setPaidMode(v)}
              >
                <ToggleButton value="all">Todas</ToggleButton>
                <ToggleButton value="paid">Solo pagadas</ToggleButton>
                <ToggleButton value="due">Con saldo</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {scopedToOwn && (
              <Chip
                icon={<LockIcon fontSize="small" />}
                label="Viendo solo tus OP"
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ alignSelf: 'flex-end' }}
              />
            )}
          </Box>

          {/* Brecha: OP pagadas que aún no están marcadas como entregadas */}
          {!isLoading && gapCount > 0 && (
            <Alert
              severity="warning"
              icon={<DeliveredIcon />}
              sx={{ mb: 2 }}
              action={
                <Tooltip arrow title={gapTooltip()}>
                  <Chip
                    label="Ver esas OP"
                    size="small"
                    color="warning"
                    onClick={() => openOrders(gapFilters())}
                    sx={{ cursor: 'pointer', mt: 0.5 }}
                  />
                </Tooltip>
              }
            >
              <strong>{gapCount} OP ya pagadas al 100% todavía no están marcadas como «Entregada»</strong>
              {' — '}
              equivalen a {formatCurrency(gapAmount)} que no comisionan hasta que se registre la
              entrega.
            </Alert>
          )}

          {/* KPIs */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            {[
              { t: 'OP del mes', v: totalOrders, s: `${formatCurrency(totalNet)} netos`, c: 'text.primary' },
              {
                t: 'Pagadas al 100%',
                v: paidOrders,
                s: totalOrders > 0
                  ? `${Math.round((paidOrders / totalOrders) * 100)}% · ${formatCurrency(paidNet)}`
                  : '—',
                c: 'success.main',
              },
              { t: 'Saldo pendiente', v: formatCurrency(dueBalance), s: `${dueOrders} OP con saldo`, c: 'warning.main' },
              {
                t: 'Listas para comisión',
                v: commissionableOrders,
                s: `Entregadas + sin saldo · ${formatCurrency(commissionableNet)}`,
                c: 'secondary.main',
              },
            ].map((k) => (
              <Card key={k.t} variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                    {k.t}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: k.c, mt: 0.25 }}>
                    {isLoading ? <Skeleton width={70} /> : k.v}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isLoading ? <Skeleton width={110} /> : k.s}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Matriz asesor × estado */}
          {isLoading ? (
            <Skeleton variant="rectangular" height={240} />
          ) : pivot.length === 0 ? (
            <Alert severity="info">No hay órdenes registradas en {MONTHS[month - 1]} de {year}.</Alert>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={DENSE_TABLE}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...DENSE_HEAD, ...STICKY_COL, fontWeight: 700 }}>
                      Asesor
                    </TableCell>
                    {STATUS_COLUMNS.map((c) => (
                      <TableCell
                        key={c.value}
                        align="right"
                        sx={{
                          ...DENSE_HEAD,
                          fontWeight: 700,
                          ...(c.value === 'DELIVERED'
                            ? {
                                color: 'success.main',
                                bgcolor: (t: any) => alpha(t.palette.success.main, 0.1),
                              }
                            : {}),
                        }}
                      >
                        {c.full ? (
                          <Tooltip title={c.full}>
                            <span>{c.label}</span>
                          </Tooltip>
                        ) : (
                          c.label
                        )}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ ...DENSE_HEAD, fontWeight: 700 }}>Total</TableCell>
                    <TableCell align="right" sx={{ ...DENSE_HEAD, fontWeight: 700, color: 'warning.main' }}>
                      <Tooltip title="OP pagadas al 100% que aún no están marcadas como entregadas. No depende de los toggles.">
                        <span>Brecha</span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pivot.map((r) => (
                    <TableRow key={r.advisorId} hover>
                      <TableCell sx={{ ...DENSE_CELL, ...STICKY_COL, fontWeight: 600 }}>
                        <Tooltip title={r.advisorName}>
                          <span>{shortAdvisorName(r.advisorName)}</span>
                        </Tooltip>
                      </TableCell>
                      {r.cells.map((v, i) => {
                        const cell = (
                          <TableCell
                            key={STATUS_COLUMNS[i].value}
                            align="right"
                            onClick={v ? () => openOrders(cellFilters(r.advisorId, STATUS_COLUMNS[i].value)) : undefined}
                            sx={{
                              ...DENSE_CELL,
                              cursor: v ? 'pointer' : 'default',
                              color: v === 0 ? 'text.disabled' : v < 0 ? 'secondary.main' : 'text.primary',
                              ...(STATUS_COLUMNS[i].value === 'DELIVERED'
                                ? { bgcolor: (t: any) => alpha(t.palette.success.main, 0.1) }
                                : {}),
                              '&:hover': v ? { bgcolor: 'action.selected' } : {},
                            }}
                          >
                            {v === 0 ? '—' : format(v)}
                          </TableCell>
                        );
                        // Sin OP no hay a dónde navegar: la celda vacía no lleva tooltip.
                        return v ? (
                          <Tooltip key={STATUS_COLUMNS[i].value} title={cellTooltip(i, r.advisorName)} arrow>
                            {cell}
                          </Tooltip>
                        ) : (
                          cell
                        );
                      })}
                      <TableCell align="right" sx={{ ...DENSE_CELL, fontWeight: 700 }}>
                        {format(r.total)}
                      </TableCell>
                      <Tooltip
                        title={r.gapCount ? gapTooltip(r.advisorName) : ''}
                        arrow
                        disableHoverListener={r.gapCount === 0}
                      >
                        <TableCell
                          align="right"
                          onClick={r.gapCount ? () => openOrders(gapFilters(r.advisorId)) : undefined}
                          sx={{
                            ...DENSE_CELL,
                            color: 'warning.main',
                            fontWeight: 700,
                            lineHeight: 1.15,
                            cursor: r.gapCount ? 'pointer' : 'default',
                            '&:hover': r.gapCount ? { bgcolor: 'action.selected' } : {},
                          }}
                        >
                          {r.gapCount === 0 ? '—' : (
                            <>
                              {r.gapCount} OP
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{ opacity: 0.8, fontSize: '0.68rem', lineHeight: 1.15 }}
                              >
                                {formatCompactCurrency(r.gapAmount)}
                              </Typography>
                            </>
                          )}
                        </TableCell>
                      </Tooltip>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow sx={{ '& td': { fontWeight: 800, color: 'text.primary', borderTop: 2, borderColor: 'divider' } }}>
                    <TableCell sx={{ ...DENSE_CELL, ...STICKY_COL }}>Total general</TableCell>
                    {totals.map((v, i) => {
                      const cell = (
                        <TableCell
                          key={STATUS_COLUMNS[i].value}
                          align="right"
                          onClick={v ? () => openOrders(cellFilters(undefined, STATUS_COLUMNS[i].value)) : undefined}
                          sx={{
                            ...DENSE_CELL,
                            cursor: v ? 'pointer' : 'default',
                            color: v === 0 ? 'text.disabled' : v < 0 ? 'secondary.main' : 'text.primary',
                            ...(STATUS_COLUMNS[i].value === 'DELIVERED'
                              ? { bgcolor: (t: any) => alpha(t.palette.success.main, 0.1) }
                              : {}),
                            '&:hover': v ? { bgcolor: 'action.selected' } : {},
                          }}
                        >
                          {v === 0 ? '—' : format(v)}
                        </TableCell>
                      );
                      return v ? (
                        <Tooltip key={STATUS_COLUMNS[i].value} title={cellTooltip(i)} arrow>
                          {cell}
                        </Tooltip>
                      ) : (
                        cell
                      );
                    })}
                    <TableCell align="right" sx={DENSE_CELL}>{format(grandTotal)}</TableCell>
                    <Tooltip title={gapCount ? gapTooltip() : ''} arrow disableHoverListener={gapCount === 0}>
                      <TableCell
                        align="right"
                        onClick={gapCount ? () => openOrders(gapFilters()) : undefined}
                        sx={{
                          ...DENSE_CELL,
                          color: 'warning.main',
                          lineHeight: 1.15,
                          cursor: gapCount ? 'pointer' : 'default',
                          '&:hover': gapCount ? { bgcolor: 'action.selected' } : {},
                        }}
                      >
                        {gapCount} OP
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ opacity: 0.8, fontSize: '0.68rem', lineHeight: 1.15 }}
                        >
                          {formatCompactCurrency(gapAmount)}
                        </Typography>
                      </TableCell>
                    </Tooltip>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            <strong>Pagada</strong> = sin saldo pendiente por cobrar. <strong>Brecha</strong> = OP
            pagadas al 100% que aún no están marcadas como entregadas; son las que no comisionan
            hasta registrar la entrega, y al hacer clic se abren para marcarlas. Los montos en
            morado son sobrepagos o saldo a favor. Haz clic en cualquier celda para abrir el
            listado de órdenes ya filtrado.
            {!canSeeAll && ' Solo ves tus propias OP.'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
