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
  IconButton,
  InputAdornment,
  Stack,
  TextField,
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
import CalculateIcon from '@mui/icons-material/Calculate';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { PageHeader } from '../../../components/common/PageHeader';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import { PATHS } from '../../../router/paths';
import { useCashSession, useCashMovements, useCashMutations } from '../hooks/useCashRegister';
import CreateMovementDialog from '../components/CreateMovementDialog';
import VoidMovementDialog from '../components/VoidMovementDialog';
import CalculatorDialog from '../components/CalculatorDialog';
import PendingApprovalsPanel from '../components/PendingApprovalsPanel';
import { useApprovalSocket } from '../hooks/useApprovalSocket';
import type { CashMovementType, CashMovement } from '../../../types/cash-register.types';

const MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
  WITHDRAWAL: 'Retiro',
  DEPOSIT: 'Depósito',
};

const MOVEMENT_TYPE_ICONS: Record<CashMovementType, React.ReactElement> = {
  INCOME: <AddCircleOutlineIcon fontSize="small" />,
  EXPENSE: <RemoveCircleOutlineIcon fontSize="small" />,
  WITHDRAWAL: <MoneyOffIcon fontSize="small" />,
  DEPOSIT: <AccountBalanceIcon fontSize="small" />,
};

const MOVEMENT_TYPE_COLORS: Record<CashMovementType, 'success' | 'error' | 'warning' | 'info'> = {
  INCOME: 'success',
  EXPENSE: 'error',
  WITHDRAWAL: 'warning',
  DEPOSIT: 'info',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
  OTHER: 'Otro',
};

const PAYMENT_METHOD_INFO: Record<string, { icon: React.ReactNode, color: string, bgcolor: string }> = {
  CASH: { icon: <LocalAtmIcon fontSize="inherit" />, color: '#2e7d32', bgcolor: 'rgba(46, 125, 50, 0.08)' },
  TRANSFER: { icon: <SyncAltIcon fontSize="inherit" />, color: '#0288d1', bgcolor: 'rgba(2, 136, 209, 0.08)' },
  CARD: { icon: <CreditCardIcon fontSize="inherit" />, color: '#7b1fa2', bgcolor: 'rgba(123, 31, 162, 0.08)' },
  CHECK: { icon: <ReceiptLongIcon fontSize="inherit" />, color: '#ed6c02', bgcolor: 'rgba(237, 108, 2, 0.08)' },
  OTHER: { icon: <MoreHorizIcon fontSize="inherit" />, color: '#424242', bgcolor: 'rgba(66, 66, 66, 0.08)' },
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

  // Real-time WebSocket for advance payment approvals
  useApprovalSocket();

  const [dialogType, setDialogType] = useState<CashMovementType | null>(null);
  const [voidTarget, setVoidTarget] = useState<CashMovement | null>(null);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [movementSearch, setMovementSearch] = useState('');

  const session = sessionQuery.data;
  const movements = movementsQuery.data?.data || [];

  const filteredMovements = useMemo(() => {
    if (!movementSearch.trim()) return movements;
    const q = movementSearch.toLowerCase();
    return movements.filter((m) => {
      const label = MOVEMENT_TYPE_LABELS[m.movementType]?.toLowerCase() || '';
      const method = (PAYMENT_METHOD_LABELS[m.paymentMethod] || m.paymentMethod || '').toLowerCase();
      return (
        m.description.toLowerCase().includes(q) ||
        m.receiptNumber.toLowerCase().includes(q) ||
        label.includes(q) ||
        method.includes(q) ||
        String(m.amount).includes(q)
      );
    });
  }, [movements, movementSearch]);

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

  // Compute breakdown by payment method
  const paymentMethodBreakdown = useMemo(() => {
    const summary: Record<string, { income: number; expense: number }> = {};
    movements
      .filter((m) => !m.isVoided)
      .forEach((m) => {
        const method = m.paymentMethod || 'CASH';
        if (!summary[method]) summary[method] = { income: 0, expense: 0 };
        const amt = Number(m.amount);
        if (m.movementType === 'INCOME' || m.movementType === 'DEPOSIT') {
          summary[method].income += amt;
        } else {
          summary[method].expense += amt;
        }
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

      {/* ── Info Bar ─────────────────────────────────────────────────── */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: { xs: 1.5, sm: 3 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <PersonIcon fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" lineHeight={1}>Cajero</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {session.openedBy.firstName} {session.openedBy.lastName}
                </Typography>
              </Box>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CalendarTodayIcon fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" lineHeight={1}>Apertura</Typography>
                <Typography variant="body2" fontWeight={500}>{formatDate(session.openedAt)}</Typography>
              </Box>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <AccountBalanceIcon fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" lineHeight={1}>Fondo Inicial</Typography>
                <Typography variant="body2" fontWeight={500}>{formatCurrency(session.openingAmount)}</Typography>
              </Box>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

            <Box>
              <Typography variant="caption" color="text.secondary" lineHeight={1}>Saldo en Caja</Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                lineHeight={1.2}
                color={runningBalance >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(runningBalance)}
              </Typography>
            </Box>

            <Box sx={{ ml: { sm: 'auto' }, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CalculateIcon />}
                onClick={() => setIsCalculatorOpen(true)}
              >
                Calculadora
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsBalanceDialogOpen(true)}
              >
                Ver balance
              </Button>
              {canCloseSession && (
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<LockIcon />}
                  onClick={() => navigate(PATHS.CASH_SESSION_CLOSE.replace(':id', id))}
                >
                  Cerrar Caja
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Action Toolbar ───────────────────────────────────────────── */}
      {canCreateMovement && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            mb: 2,
          }}
        >
          <Button
            variant="contained"
            color="success"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => setDialogType('INCOME')}
          >
            Ingreso
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<RemoveCircleOutlineIcon />}
            onClick={() => setDialogType('EXPENSE')}
          >
            Egreso
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<MoneyOffIcon />}
            onClick={() => setDialogType('WITHDRAWAL')}
          >
            Retiro
          </Button>
          <Button
            variant="contained"
            color="info"
            startIcon={<AccountBalanceIcon />}
            onClick={() => setDialogType('DEPOSIT')}
          >
            Depósito
          </Button>
        </Box>
      )}

      {/* ── Pending Advance Payment Approvals ────────────────────────── */}
      {hasPermission(PERMISSIONS.APPROVE_ADVANCE_PAYMENTS) && (
        <PendingApprovalsPanel />
      )}

      {/* ── Movements List ───────────────────────────────────────────── */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Movimientos ({movements.filter((m) => !m.isVoided).length} activos)
            </Typography>
            <ReceiptLongIcon color="action" fontSize="small" />
          </Box>
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar por descripción, recibo, tipo, método de pago..."
            value={movementSearch}
            onChange={(e) => setMovementSearch(e.target.value)}
            sx={{ mb: 1.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Divider sx={{ mb: 1.5 }} />

          {movementsQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : movements.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              No hay movimientos registrados aún.
            </Typography>
          ) : filteredMovements.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              No se encontraron movimientos para "{movementSearch}".
            </Typography>
          ) : (
            <Stack spacing={1}>
              {[...filteredMovements].reverse().map((mov) => (
                <Box
                  key={mov.id}
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: { xs: 1, sm: 2 },
                    px: { xs: 2, sm: 2.5 },
                    py: 2,
                    borderRadius: 2,
                    bgcolor: mov.isVoided ? 'action.disabledBackground' : 'background.paper',
                    opacity: mov.isVoided ? 0.6 : 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: mov.isVoided ? 'action.disabledBackground' : 'action.hover',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1, minWidth: 0, width: '100%' }}>
                    <Chip
                      icon={MOVEMENT_TYPE_ICONS[mov.movementType]}
                      label={MOVEMENT_TYPE_LABELS[mov.movementType]}
                      color={MOVEMENT_TYPE_COLORS[mov.movementType]}
                      size="small"
                      sx={{ 
                        minWidth: 95, 
                        fontWeight: 600,
                        justifyContent: 'flex-start',
                        '.MuiChip-icon': { ml: 0.5, opacity: 0.8 }
                      }}
                    />

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ mb: 0.25, color: 'text.primary' }}>
                        {mov.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {mov.receiptNumber} &middot; {formatDate(mov.createdAt)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: { xs: 'flex-start', sm: 'flex-end' }, 
                    gap: 0.5, 
                    pl: { xs: '107px', sm: 0 },
                    width: { xs: '100%', sm: 'auto' } 
                  }}>
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      color={
                        mov.isVoided
                          ? 'text.disabled'
                          : mov.movementType === 'INCOME' || mov.movementType === 'DEPOSIT'
                          ? 'success.main'
                          : 'error.main'
                      }
                      sx={{ whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}
                    >
                      {mov.movementType === 'INCOME' || mov.movementType === 'DEPOSIT' ? '+' : '-'}
                      {formatCurrency(mov.amount)}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {mov.isVoided && (
                        <Chip label="Anulado" size="small" color="default" variant="outlined" />
                      )}

                      {!mov.isVoided && PAYMENT_METHOD_INFO[mov.paymentMethod || 'OTHER'] && (
                        <Box sx={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 0.5, 
                          px: 1, 
                          py: 0.25, 
                          borderRadius: 1,
                          bgcolor: PAYMENT_METHOD_INFO[mov.paymentMethod || 'OTHER'].bgcolor,
                          color: PAYMENT_METHOD_INFO[mov.paymentMethod || 'OTHER'].color,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}>
                          {PAYMENT_METHOD_INFO[mov.paymentMethod || 'OTHER'].icon}
                          {PAYMENT_METHOD_LABELS[mov.paymentMethod] || mov.paymentMethod}
                        </Box>
                      )}

                      {!mov.isVoided && canVoidMovement && (
                        <Tooltip title="Anular movimiento">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setVoidTarget(mov)}
                            sx={{ ml: 0.5, padding: 0.25 }}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

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

      <CalculatorDialog
        open={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
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
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
            Desglose por Método de Pago
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Método</TableCell>
                  <TableCell align="right">Ingresos</TableCell>
                  <TableCell align="right">Egresos</TableCell>
                  <TableCell align="right">Neto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(paymentMethodBreakdown).map(([method, values]) => (
                  <TableRow key={method}>
                    <TableCell>{PAYMENT_METHOD_LABELS[method] || method}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {formatCurrency(values.income)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      {formatCurrency(values.expense)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: values.income - values.expense >= 0 ? 'success.main' : 'error.main' }}
                    >
                      {formatCurrency(values.income - values.expense)}
                    </TableCell>
                  </TableRow>
                ))}
                {Object.keys(paymentMethodBreakdown).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary">Sin movimientos</Typography>
                    </TableCell>
                  </TableRow>
                )}
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
