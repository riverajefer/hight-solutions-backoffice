import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { apPaymentReversalRequestsApi } from '../../../api/accounts-payable-payment-reversal-requests.api';
import type { AccountPayablePaymentReversalRequest } from '../../../types/accounts-payable-payment-reversal.types';

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(value));

const userName = (user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) => {
  if (!user) return '—';
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.email || '—';
};

const PendingApReversalsCajaPanel: React.FC<{ hideWhenEmpty?: boolean }> = ({ hideWhenEmpty }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [selected, setSelected] = useState<AccountPayablePaymentReversalRequest | null>(null);
  const [mode, setMode] = useState<'view' | 'reject'>('view');
  const [rejectionNotes, setRejectionNotes] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['ap-payment-reversals-caja', 'pending'],
    queryFn: () => apPaymentReversalRequestsApi.findPendingCaja(),
    refetchInterval: 30_000,
  });

  const pendingList = data ?? [];

  const approveMutation = useMutation({
    mutationFn: (id: string) => apPaymentReversalRequestsApi.cajaApprove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap-payment-reversals-caja'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
      enqueueSnackbar('Reversión ejecutada correctamente', { variant: 'success' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(error?.response?.data?.message || 'Error al ejecutar la reversión', { variant: 'error' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      apPaymentReversalRequestsApi.cajaReject(id, { rejectionNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap-payment-reversals-caja'] });
      enqueueSnackbar('Reversión rechazada', { variant: 'info' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(error?.response?.data?.message || 'Error al rechazar la reversión', { variant: 'error' });
    },
  });

  const isLoading2 = approveMutation.isPending || rejectMutation.isPending;

  const handleCloseDialog = () => {
    if (isLoading2) return;
    setSelected(null);
    setMode('view');
    setRejectionNotes('');
  };

  if (isLoading) return null;
  if (hideWhenEmpty && pendingList.length === 0) return null;

  return (
    <>
      <Card
        sx={{
          mb: 2,
          border: pendingList.length > 0 ? '1px solid' : undefined,
          borderColor: 'error.main',
        }}
      >
        <CardContent sx={{ pb: pendingList.length === 0 ? '16px !important' : undefined }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: pendingList.length > 0 ? 1.5 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UndoIcon color="error" fontSize="small" />
              <Typography variant="subtitle2" color="text.secondary">
                Reversiones de Pago CP — Aprobadas por Gerencia
              </Typography>
              {pendingList.length > 0 && (
                <Badge badgeContent={pendingList.length} color="error" sx={{ ml: 1 }} />
              )}
            </Box>
            <Tooltip title="Actualizar lista" arrow>
              <IconButton size="small" onClick={() => refetch()} disabled={isFetching} sx={{ color: 'text.secondary' }}>
                <RefreshIcon
                  fontSize="small"
                  sx={{
                    animation: isFetching ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>

          {pendingList.length === 0 && (
            <Typography variant="subtitle2" color="text.disabled" sx={{ mt: 0.2 }}>
              No hay reversiones pendientes de confirmación de Caja
            </Typography>
          )}

          {pendingList.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Estas reversiones fueron aprobadas por Gerencia. Confirma para revertir el pago y anular el movimiento de caja.
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
            </>
          )}

          <Stack spacing={1.5}>
            {pendingList.map((req) => {
              const ap = req.paymentAuthRequest?.accountPayable;
              const amount = req.paymentAuthRequest?.amount ?? '0';
              return (
                <Box
                  key={req.id}
                  sx={{
                    px: 2, py: 1.5, borderRadius: 2, bgcolor: 'background.paper',
                    border: '1px solid', borderColor: 'divider',
                    transition: 'all 0.2s ease',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-1px)', boxShadow: '0 4px 8px rgba(0,0,0,0.15)' },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip label={ap?.apNumber ?? '—'} size="small" color="error" variant="outlined" sx={{ fontWeight: 600 }} />
                        <Typography variant="body2" fontWeight={700} color="error.main">
                          {formatCurrency(amount)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          Solicitado por: {userName(req.requestedBy)}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        Motivo: {req.reason}
                      </Typography>
                    </Box>
                    <Box sx={{ flexShrink: 0 }}>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<UndoIcon />}
                        onClick={() => { setSelected(req); setMode('view'); }}
                        sx={{ minWidth: 130, fontSize: '0.75rem' }}
                      >
                        Revisar Reversión
                      </Button>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {selected && (
        <Dialog open={!!selected} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Confirmación de Reversión — Caja</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">CP</Typography>
                  <Typography variant="body2" fontWeight={600}>{selected.paymentAuthRequest?.accountPayable?.apNumber ?? '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Monto a revertir</Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">
                    {formatCurrency(selected.paymentAuthRequest?.amount ?? '0')}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Motivo de la reversión</Typography>
                <Typography variant="body2">{selected.reason}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Solicitado por</Typography>
                <Typography variant="body2">{userName(selected.requestedBy)}</Typography>
              </Box>
              {selected.gerenciaReviewedBy && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Aprobado por Gerencia</Typography>
                  <Typography variant="body2">{userName(selected.gerenciaReviewedBy)}</Typography>
                </Box>
              )}

              {mode === 'reject' && (
                <>
                  <Divider />
                  <TextField
                    label="Notas de rechazo (opcional)"
                    multiline rows={2} fullWidth
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    autoFocus
                  />
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button onClick={handleCloseDialog} disabled={isLoading2}>Cancelar</Button>
            {mode === 'view' ? (
              <>
                <Button
                  variant="outlined" color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => setMode('reject')}
                  disabled={isLoading2}
                >
                  Rechazar
                </Button>
                <Button
                  variant="contained" color="error"
                  startIcon={isLoading2 ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                  onClick={() => approveMutation.mutate(selected.id)}
                  disabled={isLoading2}
                >
                  Confirmar Reversión
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setMode('view')} disabled={isLoading2}>Volver</Button>
                <Button
                  variant="contained" color="error"
                  startIcon={isLoading2 ? <CircularProgress size={16} /> : <CancelIcon />}
                  onClick={() => rejectMutation.mutate({ id: selected.id, notes: rejectionNotes || undefined })}
                  disabled={isLoading2}
                >
                  Confirmar Rechazo
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default PendingApReversalsCajaPanel;
