import React, { useState, useEffect, type ReactElement } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Divider,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Flag as FlagIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import { useSalesGoals, useSalesSummary } from '../hooks';
import type { SalesGoal } from '../../../types/order.types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1];

interface GoalStatus {
  label: string;
  color: 'success' | 'warning' | 'error';
  icon: ReactElement;
}

function getGoalStatus(pct: number): GoalStatus {
  if (pct >= 100) return { label: 'Superada', color: 'success', icon: <CheckCircleIcon fontSize="small" /> };
  if (pct >= 70)  return { label: 'En camino', color: 'warning', icon: <TrendingUpIcon fontSize="small" /> };
  return { label: 'En riesgo', color: 'error', icon: <TrendingDownIcon fontSize="small" /> };
}

// ─── GoalProgressCard ─────────────────────────────────────────────────────────

interface GoalProgressCardProps {
  goal: SalesGoal;
  actual: number;
  canManage: boolean;
  onEdit: (goal: SalesGoal) => void;
  onDelete: (goal: SalesGoal) => void;
}

const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ goal, actual, canManage, onEdit, onDelete }) => {
  const target = Number(goal.targetAmount);
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const pctDisplay = target > 0 ? ((actual / target) * 100).toFixed(1) : '0.0';
  const diff = actual - target;
  const status = getGoalStatus(Number(pctDisplay));
  const advisorName = `${goal.advisor.firstName ?? ''} ${goal.advisor.lastName ?? ''}`.trim()
    || goal.advisor.email
    || goal.advisorId;

  const barColor =
    status.color === 'success' ? '#2e7d32'
    : status.color === 'warning' ? '#ed6c02'
    : '#d32f2f';

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent sx={{ p: '20px !important', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Header: nombre + chip + acciones */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mb: 2 }}>
          <Typography fontWeight={700} fontSize="1rem" noWrap sx={{ maxWidth: 180 }}>
            {advisorName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              icon={status.icon}
              label={status.label}
              color={status.color}
              size="small"
              sx={{ fontWeight: 600 }}
            />
            {canManage && (
              <>
                <Tooltip title="Editar meta">
                  <IconButton size="small" onClick={() => onEdit(goal)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar meta">
                  <IconButton size="small" color="error" onClick={() => onDelete(goal)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        {/* Circular + barras centrado */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 2 }}>
          {/* Porcentaje circular */}
          <Box
            sx={{
              position: 'relative',
              width: 100,
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="100" height="100" style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Track */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e0e0e0" strokeWidth="8" />
              {/* Progress */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={barColor}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - Math.min(Number(pctDisplay) / 100, 1))}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <Typography
              fontWeight={800}
              sx={{ color: barColor, fontSize: '1.05rem', zIndex: 1 }}
            >
              {pctDisplay}%
            </Typography>
          </Box>

          {/* Números + barra (ancho completo, centrado) */}
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Vendido</Typography>
              <Typography variant="body2" fontWeight={700} color={barColor}>
                {formatCurrency(actual)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 10,
                borderRadius: 5,
                mb: 0.5,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 5 },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Meta</Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(target)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Diferencia */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            bgcolor: diff >= 0 ? 'success.lighter' : 'error.lighter',
            borderRadius: 1,
            px: 1.5,
            py: 0.75,
            width: '100%',
            mt: 0.5,
          }}
        >
          {diff >= 0 ? (
            <TrendingUpIcon fontSize="small" color="success" />
          ) : (
            <TrendingDownIcon fontSize="small" color="error" />
          )}
          <Typography
            variant="body2"
            fontWeight={600}
            color={diff >= 0 ? 'success.dark' : 'error.dark'}
          >
            {diff >= 0
              ? `+${formatCurrency(diff)} sobre la meta`
              : `${formatCurrency(Math.abs(diff))} por alcanzar`}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// ─── GoalFormDialog ───────────────────────────────────────────────────────────

interface GoalFormDialogProps {
  open: boolean;
  goal: SalesGoal | null;
  month: number;
  year: number;
  advisors: Array<{ id: string; firstName: string | null; lastName: string | null; email: string | null }>;
  existingGoals: SalesGoal[];
  onClose: () => void;
  onSave: (advisorId: string, targetAmount: number) => void;
  saving: boolean;
}

const GoalFormDialog: React.FC<GoalFormDialogProps> = ({
  open, goal, month, year, advisors, existingGoals, onClose, onSave, saving,
}) => {
  const [advisorId, setAdvisorId] = useState('');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');

  useEffect(() => {
    if (open) {
      setAdvisorId(goal?.advisorId ?? '');
      setAmount(goal ? String(Number(goal.targetAmount)) : '');
      setAmountError('');
    }
  }, [open, goal]);

  const availableAdvisors = advisors.filter(
    (a) => a.id === goal?.advisorId || !existingGoals.find((g) => g.advisorId === a.id),
  );

  const handleSave = () => {
    const num = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!advisorId) return;
    if (!num || num <= 0) {
      setAmountError('Ingresa un monto válido mayor a 0');
      return;
    }
    onSave(advisorId, num);
  };

  const formatInput = (val: string) => {
    const digits = val.replace(/\D/g, '');
    return digits ? new Intl.NumberFormat('es-CO').format(Number(digits)) : '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FlagIcon color="primary" />
        {goal ? 'Editar meta' : 'Nueva meta'} — {MONTHS[month - 1]} {year}
      </DialogTitle>
      <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          select
          label="Asesor"
          value={advisorId}
          onChange={(e) => setAdvisorId(e.target.value)}
          fullWidth
          size="small"
          disabled={!!goal}
        >
          {(goal ? advisors : availableAdvisors).map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {`${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || a.email || a.id}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Meta de ventas (COP)"
          value={formatInput(amount)}
          onChange={(e) => {
            setAmount(e.target.value.replace(/\D/g, ''));
            setAmountError('');
          }}
          error={!!amountError}
          helperText={amountError}
          fullWidth
          size="small"
          inputProps={{ inputMode: 'numeric' }}
          placeholder="Ej: 10.000.000"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!advisorId || !amount || saving}
          startIcon={<FlagIcon />}
        >
          {saving ? 'Guardando...' : 'Guardar meta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── SalesGoalsSection (main export) ─────────────────────────────────────────

interface SalesGoalsSectionProps {
  advisors: Array<{ id: string; firstName: string | null; lastName: string | null; email: string | null }>;
}

export const SalesGoalsSection: React.FC<SalesGoalsSectionProps> = ({ advisors }) => {
  const { hasPermission } = useAuthStore();
  const canManage = hasPermission(PERMISSIONS.MANAGE_SALES_GOALS);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SalesGoal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<SalesGoal | null>(null);

  const { goalsQuery, upsertMutation, deleteMutation } = useSalesGoals({ month, year });

  // Summary for the selected month (all advisors, date range = full month)
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const summaryQuery = useSalesSummary({ orderDateFrom: monthStart, orderDateTo: monthEnd });

  const goals = goalsQuery.data ?? [];
  const summary = summaryQuery.data;

  // Build a map: advisorId → actual sales from breakdown
  const actualByAdvisor = new Map<string, number>(
    (summary?.advisorBreakdown ?? []).map((b) => [b.advisorId, b.totalRevenue]),
  );

  const openNew = () => { setEditingGoal(null); setDialogOpen(true); };
  const openEdit = (g: SalesGoal) => { setEditingGoal(g); setDialogOpen(true); };

  const handleSave = (advisorId: string, targetAmount: number) => {
    upsertMutation.mutate(
      { advisorId, month, year, targetAmount },
      { onSuccess: () => setDialogOpen(false) },
    );
  };

  const handleDelete = () => {
    if (!deletingGoal) return;
    deleteMutation.mutate(deletingGoal.id, { onSuccess: () => setDeletingGoal(null) });
  };

  const allAdvisorsWithGoals = goals.length === 0;

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader
          avatar={<TrophyIcon color="warning" />}
          title={
            <Typography variant="h6" fontWeight={700}>
              Metas de Ventas
            </Typography>
          }
          subheader="Seguimiento mensual por asesor"
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pr: 1 }}>
              {/* Selector mes */}
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
              {/* Selector año */}
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
              {canManage && (
                <Tooltip title="Agregar meta para un asesor">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={openNew}
                    disabled={advisors.length === 0}
                  >
                    Agregar
                  </Button>
                </Tooltip>
              )}
            </Box>
          }
          sx={{ pb: 0 }}
        />

        <Divider sx={{ mt: 1 }} />

        <CardContent>
          {goalsQuery.isLoading || summaryQuery.isLoading ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={160} />)}
            </Box>
          ) : allAdvisorsWithGoals ? (
            <Alert
              severity="info"
              action={
                canManage ? (
                  <Button size="small" startIcon={<AddIcon />} onClick={openNew}>
                    Agregar primera meta
                  </Button>
                ) : undefined
              }
            >
              No hay metas configuradas para {MONTHS[month - 1]} {year}.
              {!canManage && ' Contacta a un administrador para configurarlas.'}
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 2,
              }}
            >
              {goals.map((goal) => (
                <GoalProgressCard
                  key={goal.id}
                  goal={goal}
                  actual={actualByAdvisor.get(goal.advisorId) ?? 0}
                  canManage={canManage}
                  onEdit={openEdit}
                  onDelete={setDeletingGoal}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog crear/editar */}
      <GoalFormDialog
        open={dialogOpen}
        goal={editingGoal}
        month={month}
        year={year}
        advisors={advisors.map((a) => ({ ...a, email: null }))}
        existingGoals={goals}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        saving={upsertMutation.isPending}
      />

      {/* Dialog confirmar eliminación */}
      <Dialog open={!!deletingGoal} onClose={() => setDeletingGoal(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar meta</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar la meta de{' '}
            <strong>
              {`${deletingGoal?.advisor.firstName ?? ''} ${deletingGoal?.advisor.lastName ?? ''}`.trim()}
            </strong>{' '}
            para {deletingGoal ? MONTHS[deletingGoal.month - 1] : ''} {deletingGoal?.year}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingGoal(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
