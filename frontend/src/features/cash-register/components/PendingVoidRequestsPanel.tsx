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
import BlockIcon from '@mui/icons-material/Block';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import {
  usePendingVoidRequests,
  useApproveVoidRequest,
  useRejectVoidRequest,
} from '../../../hooks/useVoidRequests';
import type { CashMovementVoidRequest } from '../../../types/void-request.types';

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
  WITHDRAWAL: 'Retiro',
  DEPOSIT: 'Depósito',
};

const MOVEMENT_TYPE_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
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
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const PendingVoidRequestsPanel: React.FC = () => {
  const { data: requests = [], isLoading, isFetching, refetch } = usePendingVoidRequests();
  const approveMutation = useApproveVoidRequest();
  const rejectMutation = useRejectVoidRequest();

  const [reviewTarget, setReviewTarget] = useState<{
    request: CashMovementVoidRequest;
    action: 'approve' | 'reject';
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const handleAction = (request: CashMovementVoidRequest, action: 'approve' | 'reject') => {
    setReviewTarget({ request, action });
    setReviewNotes('');
  };

  const handleSubmitReview = async () => {
    if (!reviewTarget) return;
    const { request, action } = reviewTarget;
    const dto = reviewNotes.trim() ? { reviewNotes } : {};

    if (action === 'approve') {
      await approveMutation.mutateAsync({ requestId: request.id, dto });
    } else {
      await rejectMutation.mutateAsync({ requestId: request.id, dto });
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
      <Card sx={{ mb: 2, border: requests.length > 0 ? '1px solid' : undefined, borderColor: 'error.main' }}>
        <CardContent sx={{ pb: requests.length === 0 ? '16px !important' : undefined }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: requests.length > 0 ? 1.5 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BlockIcon color="error" fontSize="small" />
              <Typography variant="subtitle2" color="text.secondary">
                Solicitudes de Anulación Pendientes
              </Typography>
              {requests.length > 0 && (
                <Badge badgeContent={requests.length} color="error" sx={{ ml: 1 }} />
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
              const mov = req.cashMovement;
              const requesterName =
                [req.requestedBy.firstName, req.requestedBy.lastName].filter(Boolean).join(' ') ||
                req.requestedBy.email;

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
                      {/* Receipt Number + Type */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        {mov && (
                          <>
                            <Chip
                              label={mov.receiptNumber}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                            <Chip
                              label={MOVEMENT_TYPE_LABELS[mov.movementType] || mov.movementType}
                              size="small"
                              color={MOVEMENT_TYPE_COLORS[mov.movementType] || 'default'}
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </>
                        )}
                      </Box>

                      {/* Requester */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          Solicitado por: {requesterName}
                        </Typography>
                      </Box>

                      {/* Amount + Date */}
                      {mov && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700} color="error.main">
                            {formatCurrency(mov.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                            {formatDate(req.createdAt)}
                          </Typography>
                        </Box>
                      )}

                      {/* Description */}
                      {mov?.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }} noWrap>
                          {mov.description}
                        </Typography>
                      )}

                      {/* Void reason */}
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Motivo: {req.voidReason}
                      </Typography>
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
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {reviewTarget?.action === 'approve'
            ? 'Aprobar Anulación'
            : 'Rechazar Anulación'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {reviewTarget?.action === 'approve'
              ? 'Al aprobar, el movimiento será anulado inmediatamente.'
              : '¿Seguro que deseas rechazar esta solicitud de anulación?'}
          </Typography>
          <TextField
            label="Notas (opcional)"
            fullWidth
            multiline
            rows={2}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Notas adicionales..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewTarget(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={reviewTarget?.action === 'approve' ? 'success' : 'error'}
            onClick={handleSubmitReview}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            startIcon={
              approveMutation.isPending || rejectMutation.isPending ? (
                <CircularProgress size={16} />
              ) : undefined
            }
          >
            {reviewTarget?.action === 'approve' ? 'Aprobar' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PendingVoidRequestsPanel;
