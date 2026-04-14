import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { advancePaymentApprovalsApi } from '../../../api/advance-payment-approvals.api';
import type { AdvancePaymentApproval } from '../../../types/advance-payment-approval.types';
import ApprovalReviewDialog from './ApprovalReviewDialog';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
  CREDIT: 'Crédito',
  OTHER: 'Otro',
};

const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <LocalAtmIcon fontSize="inherit" />,
  TRANSFER: <SyncAltIcon fontSize="inherit" />,
  CARD: <CreditCardIcon fontSize="inherit" />,
  CHECK: <ReceiptLongIcon fontSize="inherit" />,
  OTHER: <MoreHorizIcon fontSize="inherit" />,
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

const PendingApprovalsPanel: React.FC = () => {
  const { data: approvals = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['advancePaymentApprovals', 'pending'],
    queryFn: () => advancePaymentApprovalsApi.findPending(),
    refetchInterval: 30_000,
  });

  const [selectedApproval, setSelectedApproval] = useState<AdvancePaymentApproval | null>(null);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject'>('approve');

  const handleAction = (approval: AdvancePaymentApproval, action: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setDialogAction(action);
  };

  const handleCloseDialog = () => {
    setSelectedApproval(null);
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
      <Card sx={{ mb: 2, border: approvals.length > 0 ? '1px solid' : undefined, borderColor: 'warning.main' }}>
        <CardContent sx={{ pb: approvals.length === 0 ? '16px !important' : undefined }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: approvals.length > 0 ? 1.5 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIcon color="warning" fontSize="small" />
              <Typography variant="subtitle2" color="text.secondary">
                Solicitudes de Anticipo Pendientes
              </Typography>
              {approvals.length > 0 && (
                <Badge badgeContent={approvals.length} color="warning" sx={{ ml: 1 }} />
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

          {approvals.length === 0 && (
            <Typography variant="subtitle2" color="text.disabled" sx={{ mt: 0.2 }}>
              No hay solicitudes pendientes
            </Typography>
          )}

          {approvals.length > 0 && <Divider sx={{ mb: 1.5 }} />}

          <Stack spacing={1.5}>
            {approvals.map((approval) => {
              const clientName = approval.order.client?.name || '—';

              const requesterName =
                [approval.requestedBy.firstName, approval.requestedBy.lastName].filter(Boolean).join(' ') ||
                approval.requestedBy.email;

              return (
                <Box
                  key={approval.id}
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
                          label={approval.order.orderNumber}
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
                          icon={<>{PAYMENT_METHOD_ICONS[approval.payment.paymentMethod] || null}</>}
                          label={PAYMENT_METHOD_LABELS[approval.payment.paymentMethod] || approval.payment.paymentMethod}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                        <Typography variant="body2" fontWeight={700} color="primary.main">
                          {formatCurrency(approval.payment.amount)}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                          {formatDate(approval.createdAt)}
                        </Typography>
                      </Box>

                      {/* Reason */}
                      {approval.reason && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Motivo: {approval.reason}
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
                        onClick={() => handleAction(approval, 'approve')}
                        sx={{ minWidth: 100, fontSize: '0.75rem' }}
                      >
                        Aprobar
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<CancelIcon />}
                        onClick={() => handleAction(approval, 'reject')}
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

      <ApprovalReviewDialog
        open={!!selectedApproval}
        approval={selectedApproval}
        action={dialogAction}
        onClose={handleCloseDialog}
      />
    </>
  );
};

export default PendingApprovalsPanel;
