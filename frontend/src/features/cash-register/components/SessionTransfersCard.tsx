import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import { useSessionCashTransfers } from '../../../hooks/useCashTransferRequests';
import { PATHS } from '../../../router/paths';
import { formatCurrency } from '../../../utils/formatters';
import { formatDateTime, formatSigned } from '../utils/cashTransfer';

const userName = (u: { firstName: string | null; lastName: string | null; email: string | null } | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—' : '—';

/**
 * Traslados que salieron de esta sesión (su cierre quedó corregido) o que
 * entraron a ella desde un cierre anterior. Hace visible que un arqueo firmado
 * se modificó después.
 */
const SessionTransfersCard: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const { data: transfers = [] } = useSessionCashTransfers(sessionId);
  if (transfers.length === 0) return null;

  const outgoing = transfers.filter((t) => t.sourceSessionId === sessionId);
  const incoming = transfers.filter((t) => t.targetSessionId === sessionId);
  const appliedOut = outgoing.filter((t) => t.status === 'APPROVED');
  const pendingOut = outgoing.filter((t) => t.status === 'PENDING');

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <SyncAltIcon fontSize="small" color="warning" />
          <Typography variant="subtitle1" fontWeight={700}>Traslados de caja</Typography>
          {appliedOut.length > 0 && <Chip label="Cierre corregido" color="warning" size="small" />}
          {pendingOut.length > 0 && (
            <Chip label={`${pendingOut.length} pendiente${pendingOut.length > 1 ? 's' : ''}`} size="small" variant="outlined" />
          )}
        </Box>

        {appliedOut.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            Este cierre se corrigió después de firmado: los movimientos de abajo pasaron a otra sesión y
            el esperado y la diferencia se recalcularon.
          </Alert>
        )}

        <Stack spacing={1}>
          {[...outgoing, ...incoming.filter((t) => !outgoing.includes(t))].map((t) => {
            const isOut = t.sourceSessionId === sessionId;
            const otherSessionId = isOut ? t.targetSessionId : t.sourceSessionId;
            return (
              <Box key={t.id} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {t.cashMovement.receiptNumber} · {formatCurrency(t.cashMovement.amount)}{' '}
                    {!isOut ? (
                      <>
                        llegó desde{' '}
                        <Link to={PATHS.CASH_SESSION_HISTORY_DETAIL.replace(':id', t.sourceSessionId)}>
                          el cierre del {formatDateTime(t.sourceSession.closedAt)}
                        </Link>
                      </>
                    ) : otherSessionId ? (
                      <>
                        pasó a{' '}
                        <Link to={PATHS.CASH_SESSION_HISTORY_DETAIL.replace(':id', otherSessionId)}>
                          la caja abierta el {formatDateTime(t.targetSession?.openedAt)}
                        </Link>
                      </>
                    ) : (
                      'pasará a la caja abierta cuando el administrador lo apruebe'
                    )}
                  </Typography>
                  <Chip
                    size="small"
                    label={t.status === 'APPROVED' ? 'Aplicado' : t.status === 'PENDING' ? 'Pendiente' : 'Rechazado'}
                    color={t.status === 'APPROVED' ? 'success' : 'default'}
                    variant="outlined"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" component="div">
                  {t.reason} — pidió {userName(t.requestedBy)}
                  {t.reviewedBy ? `, aprobó ${userName(t.reviewedBy)}` : ''}
                  {t.appliedAt ? ` el ${formatDateTime(t.appliedAt)}` : ''}
                </Typography>
                {isOut && t.sourceDiscrepancyBefore !== null && t.sourceDiscrepancyAfter !== null && (
                  <Typography variant="caption" color="text.secondary" component="div">
                    Diferencia del cierre: {formatSigned(t.sourceDiscrepancyBefore)} →{' '}
                    {formatSigned(t.sourceDiscrepancyAfter)}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default SessionTransfersCard;
