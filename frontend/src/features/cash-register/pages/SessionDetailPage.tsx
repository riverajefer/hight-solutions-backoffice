import React from 'react';
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
  Stack,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PageHeader } from '../../../components/common/PageHeader';
import { useCashSession } from '../hooks/useCashRegister';
import ConciliationSummary from '../components/ConciliationSummary';
import { PATHS } from '../../../router/paths';
import type { CashMovementType } from '../../../types/cash-register.types';

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

const SessionDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sessionQuery = useCashSession(id);
  const session = sessionQuery.data;

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

  const movements = session.movements || [];
  const closingDenominations = session.denominations.filter((d) => d.countType === 'CLOSING');

  // Build conciliation preview from session data (for closed sessions)
  const conciliationPreview = session.status === 'CLOSED' && session.systemBalance
    ? {
        sessionId: session.id,
        status: session.status as 'CLOSED',
        openingAmount: session.openingAmount,
        systemBalance: session.systemBalance,
        totalIncome: String(
          movements
            .filter((m) => m.movementType === 'INCOME' && !m.isVoided)
            .reduce((a, m) => a + Number(m.amount), 0),
        ),
        totalExpense: String(
          movements
            .filter((m) => m.movementType === 'EXPENSE' && !m.isVoided)
            .reduce((a, m) => a + Number(m.amount), 0),
        ),
        totalWithdrawals: String(
          movements
            .filter((m) => m.movementType === 'WITHDRAWAL' && !m.isVoided)
            .reduce((a, m) => a + Number(m.amount), 0),
        ),
        totalDeposits: String(
          movements
            .filter((m) => m.movementType === 'DEPOSIT' && !m.isVoided)
            .reduce((a, m) => a + Number(m.amount), 0),
        ),
        movementCount: movements.filter((m) => !m.isVoided).length,
      }
    : null;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(PATHS.CASH_SESSION_HISTORY)}
        sx={{ mb: 2 }}
      >
        Volver al Historial
      </Button>

      <PageHeader
        title={`Sesión — ${session.cashRegister.name}`}
        subtitle={`${session.status === 'OPEN' ? 'Abierta' : 'Cerrada'} · ${formatDate(session.openedAt)}`}
      />

      <Grid container spacing={2} alignItems="flex-start">
        {/* Session metadata */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Información
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Estado</Typography>
                  <Chip
                    label={session.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                    color={session.status === 'OPEN' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Cajero</Typography>
                  <Typography variant="body2">
                    {session.openedBy.firstName} {session.openedBy.lastName}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Apertura</Typography>
                  <Typography variant="body2">{formatDate(session.openedAt)}</Typography>
                </Box>
                {session.closedAt && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Cierre</Typography>
                    <Typography variant="body2">{formatDate(session.closedAt)}</Typography>
                  </Box>
                )}
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Fondo Inicial</Typography>
                  <Typography variant="body2" fontWeight={600}>{formatCurrency(session.openingAmount)}</Typography>
                </Box>
                {session.closingAmount && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Conteo Físico</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(session.closingAmount)}</Typography>
                  </Box>
                )}
                {session.systemBalance && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Saldo Sistema</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(session.systemBalance)}</Typography>
                  </Box>
                )}
                {session.discrepancy !== undefined && session.discrepancy !== null && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Descuadre</Typography>
                    <Chip
                      label={
                        Number(session.discrepancy) === 0
                          ? 'Cuadrada'
                          : Number(session.discrepancy) > 0
                          ? `+${formatCurrency(session.discrepancy)}`
                          : formatCurrency(session.discrepancy)
                      }
                      color={
                        Number(session.discrepancy) === 0
                          ? 'success'
                          : Number(session.discrepancy) > 0
                          ? 'warning'
                          : 'error'
                      }
                      size="small"
                    />
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Movements */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Movimientos ({movements.length})
              </Typography>
              <Divider sx={{ mb: 1.5 }} />

              {movements.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                  No hay movimientos en esta sesión.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Recibo</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movements.map((mov) => (
                      <TableRow
                        key={mov.id}
                        sx={{ opacity: mov.isVoided ? 0.5 : 1 }}
                      >
                        <TableCell>
                          <Typography variant="caption">{mov.receiptNumber}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={MOVEMENT_TYPE_LABELS[mov.movementType]}
                            color={MOVEMENT_TYPE_COLORS[mov.movementType]}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {mov.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color={
                              mov.isVoided
                                ? 'text.disabled'
                                : mov.movementType === 'INCOME' || mov.movementType === 'DEPOSIT'
                                ? 'success.main'
                                : 'error.main'
                            }
                          >
                            {mov.movementType === 'INCOME' || mov.movementType === 'DEPOSIT' ? '+' : '-'}
                            {formatCurrency(mov.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{formatDate(mov.createdAt)}</Typography>
                        </TableCell>
                        <TableCell>
                          {mov.isVoided && (
                            <Chip label="Anulado" size="small" color="default" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Conciliation (only for closed sessions with denomination data) */}
          {conciliationPreview && closingDenominations.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Conciliación de Cierre
              </Typography>
              <ConciliationSummary
                denominations={closingDenominations.map((d) => ({
                  denomination: d.denomination as any,
                  quantity: d.quantity,
                }))}
                preview={conciliationPreview}
                readonly
              />
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default SessionDetailPage;
