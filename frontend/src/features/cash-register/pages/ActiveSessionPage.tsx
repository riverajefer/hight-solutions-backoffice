import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import LockIcon from '@mui/icons-material/Lock';
import BlockIcon from '@mui/icons-material/Block';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { PageHeader } from '../../../components/common/PageHeader';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import { PATHS } from '../../../router/paths';
import { useCashSession, useCashMovements, useCashMutations } from '../hooks/useCashRegister';
import CreateMovementDialog from '../components/CreateMovementDialog';
import VoidMovementDialog from '../components/VoidMovementDialog';
import type { CashMovementType, CashMovement } from '../../../types/cash-register.types';

const MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
  WITHDRAWAL: 'Retiro',
  DEPOSIT: 'Depósito',
};

const MOVEMENT_TYPE_COLORS: Record<CashMovementType, 'success' | 'error' | 'warning' | 'info'> = {
  INCOME: 'success',
  EXPENSE: 'error',
  WITHDRAWAL: 'warning',
  DEPOSIT: 'info',
};

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

const ActiveSessionPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const sessionQuery = useCashSession(id);
  const movementsQuery = useCashMovements({ cashSessionId: id, includeVoided: true });
  const { createMovement, voidMovement } = useCashMutations();

  const [dialogType, setDialogType] = useState<CashMovementType | null>(null);
  const [voidTarget, setVoidTarget] = useState<CashMovement | null>(null);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);

  const session = sessionQuery.data;
  const movements = movementsQuery.data?.data || [];

  const balanceBreakdown = useMemo(() => {
    const summary: Record<string, number> = {
      INCOME: 0,
      EXPENSE: 0,
      WITHDRAWAL: 0,
      DEPOSIT: 0,
    };
    movements
      .filter((m) => !m.isVoided)
      .forEach((m) => {
        summary[m.movementType] += Number(m.amount);
      });
    return summary;
  }, [movements]);

  // Redirect if session is closed
  React.useEffect(() => {
    if (session && session.status === 'CLOSED') {
      navigate(PATHS.CASH_SESSION_HISTORY_DETAIL.replace(':id', id), { replace: true });
    }
  }, [session, id, navigate]);

  // Compute running balance from movements (client-side)
  const runningBalance = useMemo(() => {
    if (!session) return 0;
    const base = Number(session.openingAmount);
    const delta = movements
      .filter((m) => !m.isVoided)
      .reduce((acc, m) => {
        const amt = Number(m.amount);
        if (m.movementType === 'INCOME' || m.movementType === 'DEPOSIT') return acc + amt;
        return acc - amt;
      }, 0);
    return base + delta;
  }, [session, movements]);

  const handleCreateMovement = async (data: Parameters<typeof createMovement.mutateAsync>[0]) => {
    await createMovement.mutateAsync(data);
    setDialogType(null);
  };

  const handleVoidMovement = async (movId: string, voidReason: string) => {
    await voidMovement.mutateAsync({ id: movId, dto: { voidReason } });
    setVoidTarget(null);
  };

  if (sessionQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Sesión no encontrada.</Alert>
      </Box>
    );
  }

  const canCreateMovement = hasPermission(PERMISSIONS.CREATE_CASH_MOVEMENTS);
  const canVoidMovement = hasPermission(PERMISSIONS.VOID_CASH_MOVEMENTS);
  const canCloseSession = hasPermission(PERMISSIONS.CLOSE_CASH_SESSION);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title={`Sesión — ${session.cashRegister.name}`}
        subtitle={`Abierta el ${formatDate(session.openedAt)}`}
      />

      <Grid container spacing={2} alignItems="flex-start">
        {/* ── Left: Session Info ────────────────────────────────────── */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Información de Sesión
              </Typography>
              <Divider sx={{ mb: 1.5 }} />

              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Cajero</Typography>
                    <Typography variant="body2">
                      {session.openedBy.firstName} {session.openedBy.lastName}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarTodayIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Apertura</Typography>
                    <Typography variant="body2">{formatDate(session.openedAt)}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountBalanceIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Fondo Inicial</Typography>
                    <Typography variant="body2">{formatCurrency(session.openingAmount)}</Typography>
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary">Saldo en Caja</Typography>
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    color={runningBalance >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(runningBalance)}
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    fullWidth
                    sx={{ mt: 1 }}
                    onClick={() => setIsBalanceDialogOpen(true)}
                  >
                    Ver balance detallado
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Close Session */}
          {canCloseSession && (
            <Button
              variant="outlined"
              color="warning"
              fullWidth
              startIcon={<LockIcon />}
              sx={{ mt: 2 }}
              onClick={() => navigate(PATHS.CASH_SESSION_CLOSE.replace(':id', id))}
            >
              Cerrar Sesión
            </Button>
          )}
        </Grid>

        {/* ── Center: Movements List ────────────────────────────────── */}
        <Grid item xs={12} md={6}>
          <Card sx={{ minHeight: 400 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Movimientos ({movements.filter((m) => !m.isVoided).length} activos)
                </Typography>
                <ReceiptLongIcon color="action" fontSize="small" />
              </Box>
              <Divider sx={{ mb: 1.5 }} />

              {movementsQuery.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : movements.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No hay movimientos registrados aún.
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {[...movements].reverse().map((mov) => (
                    <Box
                      key={mov.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 1,
                        borderRadius: 1,
                        bgcolor: mov.isVoided ? 'action.disabledBackground' : 'action.hover',
                        opacity: mov.isVoided ? 0.6 : 1,
                      }}
                    >
                      {/* Type chip */}
                      <Chip
                        label={MOVEMENT_TYPE_LABELS[mov.movementType]}
                        color={MOVEMENT_TYPE_COLORS[mov.movementType]}
                        size="small"
                        variant="outlined"
                        sx={{ minWidth: 72 }}
                      />

                      {/* Description */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap>
                          {mov.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {mov.receiptNumber} · {formatDate(mov.createdAt)}
                        </Typography>
                      </Box>

                      {/* Amount */}
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={
                          mov.isVoided
                            ? 'text.disabled'
                            : mov.movementType === 'INCOME' || mov.movementType === 'DEPOSIT'
                            ? 'success.main'
                            : 'error.main'
                        }
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {mov.movementType === 'INCOME' || mov.movementType === 'DEPOSIT' ? '+' : '-'}
                        {formatCurrency(mov.amount)}
                      </Typography>

                      {/* Voided badge */}
                      {mov.isVoided && (
                        <Chip label="Anulado" size="small" color="default" />
                      )}

                      {/* Void action */}
                      {!mov.isVoided && canVoidMovement && (
                        <Tooltip title="Anular movimiento">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setVoidTarget(mov)}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: Action Buttons ─────────────────────────────────── */}
        {canCreateMovement && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Registrar Movimiento
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.5}>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    fullWidth
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => setDialogType('INCOME')}
                  >
                    Ingreso
                  </Button>

                  <Button
                    variant="contained"
                    color="error"
                    size="large"
                    fullWidth
                    startIcon={<RemoveCircleOutlineIcon />}
                    onClick={() => setDialogType('EXPENSE')}
                  >
                    Egreso
                  </Button>

                  <Button
                    variant="contained"
                    color="warning"
                    size="large"
                    fullWidth
                    startIcon={<MoneyOffIcon />}
                    onClick={() => setDialogType('WITHDRAWAL')}
                  >
                    Retiro de Efectivo
                  </Button>

                  <Button
                    variant="contained"
                    color="info"
                    size="large"
                    fullWidth
                    startIcon={<AccountBalanceIcon />}
                    onClick={() => setDialogType('DEPOSIT')}
                  >
                    Depósito a Caja
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
      {dialogType && (
        <CreateMovementDialog
          open={!!dialogType}
          movementType={dialogType}
          cashSessionId={id}
          onClose={() => setDialogType(null)}
          onSubmit={handleCreateMovement}
          isLoading={createMovement.isPending}
        />
      )}

      <VoidMovementDialog
        open={!!voidTarget}
        movement={voidTarget}
        onClose={() => setVoidTarget(null)}
        onSubmit={handleVoidMovement}
        isLoading={voidMovement.isPending}
      />

      {/* ── Balance Detail Dialog ────────────────────────────────────── */}
      <Dialog open={isBalanceDialogOpen} onClose={() => setIsBalanceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Balance Detallado</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Concepto</TableCell>
                  <TableCell align="right">Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Fondo Inicial</TableCell>
                  <TableCell align="right">{formatCurrency(session.openingAmount)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Ingresos (+)</TableCell>
                  <TableCell align="right" sx={{ color: 'success.main' }}>
                    {formatCurrency(balanceBreakdown.INCOME)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Depósitos (+)</TableCell>
                  <TableCell align="right" sx={{ color: 'success.main' }}>
                    {formatCurrency(balanceBreakdown.DEPOSIT)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Egresos (-)</TableCell>
                  <TableCell align="right" sx={{ color: 'error.main' }}>
                    {formatCurrency(balanceBreakdown.EXPENSE)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Retiros (-)</TableCell>
                  <TableCell align="right" sx={{ color: 'error.main' }}>
                    {formatCurrency(balanceBreakdown.WITHDRAWAL)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2}>
                    <Divider />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Saldo Actual</strong></TableCell>
                  <TableCell align="right">
                    <strong>{formatCurrency(runningBalance)}</strong>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <strong>Descuadre</strong>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Diferencia entre saldo actual y fondo inicial
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const discrepancy = runningBalance - Number(session.openingAmount);
                      const isPositive = discrepancy > 0;
                      const isNegative = discrepancy < 0;
                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Typography
                            variant="h6"
                            fontWeight={700}
                            color={isNegative ? 'error.main' : isPositive ? 'success.main' : 'text.primary'}
                          >
                            {isPositive ? '+' : ''}{formatCurrency(discrepancy)}
                          </Typography>
                          <Chip
                            label={isNegative ? 'Déficit' : isPositive ? 'Superávit' : 'Sin descuadre'}
                            color={isNegative ? 'error' : isPositive ? 'success' : 'default'}
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsBalanceDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActiveSessionPage;
