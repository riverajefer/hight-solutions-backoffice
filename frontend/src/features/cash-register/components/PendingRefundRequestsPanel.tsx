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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import {
  usePendingRefundRequests,
  useApproveRefundRequest,
  useRejectRefundRequest,
} from '../../orders/hooks/useRefundRequests';
import type { RefundRequest } from '../../../types/refund-request.types';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
};

const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <LocalAtmIcon fontSize="inherit" />,
  TRANSFER: <SyncAltIcon fontSize="inherit" />,
  CARD: <CreditCardIcon fontSize="inherit" />,
};

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(value));

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const PendingRefundRequestsPanel: React.FC = () => {
  const { data: requests = [], isLoading, isFetching, refetch } = usePendingRefundRequests();
  const approveMutation = useApproveRefundRequest();
  const rejectMutation = useRejectRefundRequest();

  const [reviewTarget, setReviewTarget] = useState<{
    request: RefundRequest;
    action: 'approve' | 'reject';
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const handleAction = (request: RefundRequest, action: 'approve' | 'reject') => {
    setReviewTarget({ request, action });
    setReviewNotes('');
  };

  const handleSubmitReview = async () => {
    if (!reviewTarget) return;
    const { request, action } = reviewTarget;

    if (action === 'approve') {
      await approveMutation.mutateAsync({
        id: request.id,
        dto: reviewNotes.trim() ? { reviewNotes } : undefined,
      });
    } else {
      if (!reviewNotes.trim()) return;
      await rejectMutation.mutateAsync({
        id: request.id,
        dto: { reviewNotes },
      });
    }
    setReviewTarget(null);
  };

  if (isLoading) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ mb: 2, border: requests.length > 0 ? '1px solid' : undefined, borderColor: 'info.main' }}>
        <CardContent sx={{ pb: requests.length === 0 ? '16px !important' : undefined }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: requests.length > 0 ? 1.5 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CurrencyExchangeIcon color="info" fontSize="small" />
              <Typography variant="subtitle2" color="text.secondary">
                Solicitudes de Devolución Pendientes
              </Typography>
              {requests.length > 0 && (
                <Badge badgeContent={requests.length} color="info" sx={{ ml: 1 }} />
              )}
            </Box>
            <Tooltip title="Actualizar solicitudes" arrow>
              <IconButton
                size="small"
                onClick={() => refetch()}
                disabled={isFetching}
                sx={{ color: 'text.secondary' }}
              >
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

          {requests.length === 0 && (
            <Typography variant="subtitle2" color="text.disabled" sx={{ mt: 0.2 }}>
              No hay solicitudes pendientes
            </Typography>
          )}

          {requests.length > 0 && <Divider sx={{ mb: 1.5 }} />}

          <Stack spacing={1.5}>
            {requests.map((req) => {
              const clientName = req.order?.client?.name || '—';
              const requesterName =
                [req.requestedBy?.firstName, req.requestedBy?.lastName].filter(Boolean).join(' ') ||
                req.requestedBy?.email || '—';

              return (
                <Box
                  key={req.id}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {/* Order Number + Client */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={req.order?.orderNumber || '—'}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {clientName}
                        </Typography>
                      </Box>

                      {/* Requester */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          Solicitado por: {requesterName}
                        </Typography>
                      </Box>

                      {/* Payment method + Amount */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          icon={<>{PAYMENT_METHOD_ICONS[req.paymentMethod] || null}</>}
                          label={PAYMENT_METHOD_LABELS[req.paymentMethod] || req.paymentMethod}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                        <Typography variant="body2" fontWeight={700} color="info.main">
                          {formatCurrency(req.refundAmount)}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                          {formatDate(req.requestedAt)}
                        </Typography>
                      </Box>

                      {/* Observation */}
                      {req.observation && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Motivo: {req.observation}
                        </Typography>
                      )}
                    </Box>

                    {/* Action buttons */}
                    <Stack spacing={0.5} sx={{ flexShrink: 0 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleAction(req, 'approve')}
                        sx={{ minWidth: 100, fontSize: '0.75rem' }}
                      >
                        Aprobar
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<CancelIcon />}
                        onClick={() => handleAction(req, 'reject')}
                        sx={{ minWidth: 100, fontSize: '0.75rem' }}
                      >
                        Rechazar
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reviewTarget?.action === 'approve'
            ? 'Aprobar Devolución'
            : 'Rechazar Devolución'}
        </DialogTitle>
        <DialogContent>
          {reviewTarget?.request && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Orden:</strong> {reviewTarget.request.order?.orderNumber || '—'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Monto a devolver:</strong> {formatCurrency(reviewTarget.request.refundAmount)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Método:</strong>{' '}
                {PAYMENT_METHOD_LABELS[reviewTarget.request.paymentMethod] || reviewTarget.request.paymentMethod}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Solicitado por:</strong>{' '}
                {[reviewTarget.request.requestedBy?.firstName, reviewTarget.request.requestedBy?.lastName].filter(Boolean).join(' ') ||
                  reviewTarget.request.requestedBy?.email || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Motivo:</strong> {reviewTarget.request.observation}
              </Typography>
              {reviewTarget.action === 'approve' && (
                <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                  Al aprobar, se creará un egreso en la caja y se ajustará el saldo de la orden.
                </Typography>
              )}
            </Box>
          )}

          <TextField
            fullWidth
            multiline
            rows={4}
            label={reviewTarget?.action === 'approve' ? 'Notas (opcional)' : 'Razón del rechazo *'}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={
              reviewTarget?.action === 'approve'
                ? 'Agregue notas adicionales...'
                : 'Explique por qué se rechaza la devolución...'
            }
            required={reviewTarget?.action === 'reject'}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewTarget(null)}>Cancelar</Button>
          <Button
            onClick={handleSubmitReview}
            variant="contained"
            color={reviewTarget?.action === 'approve' ? 'success' : 'error'}
            disabled={
              approveMutation.isPending ||
              rejectMutation.isPending ||
              (reviewTarget?.action === 'reject' && !reviewNotes.trim())
            }
          >
            {reviewTarget?.action === 'approve' ? 'Aprobar' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PendingRefundRequestsPanel;
