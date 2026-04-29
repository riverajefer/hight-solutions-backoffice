import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { apPaymentAuthRequestsApi } from '../../../api/accounts-payable-payment-auth-requests.api';
import type { AccountPayablePaymentAuthRequest } from '../../../types/accounts-payable.types';
import { CajaApprovePaymentDialog } from '../../accounts-payable/components/CajaApprovePaymentDialog';

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(value));

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CREDIT: 'Crédito',
};

const userName = (user?: { firstName?: string | null; lastName?: string | null; email: string } | null) => {
  if (!user) return '—';
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.email;
};

const PendingApAuthorizationsPanel: React.FC<{ hideWhenEmpty?: boolean }> = ({ hideWhenEmpty }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedRequest, setSelectedRequest] = useState<AccountPayablePaymentAuthRequest | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['ap-payment-auth-requests-caja', 'pending'],
    queryFn: () => apPaymentAuthRequestsApi.findPendingCaja(),
    refetchInterval: 30_000,
  });

  const pendingRequests = data ?? [];

  const cajaApproveMutation = useMutation({
    mutationFn: (id: string) => apPaymentAuthRequestsApi.cajaApprove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap-payment-auth-requests-caja'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] });
      enqueueSnackbar('Pago registrado correctamente', { variant: 'success' });
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al registrar el pago';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const cajaRejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apPaymentAuthRequestsApi.cajaReject(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap-payment-auth-requests-caja'] });
      enqueueSnackbar('Solicitud rechazada', { variant: 'info' });
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al rechazar el pago';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  if (isLoading) return null;
  if (hideWhenEmpty && pendingRequests.length === 0) return null;

  return (
    <>
      <Card
        sx={{
          mb: 2,
          border: pendingRequests.length > 0 ? '1px solid' : undefined,
          borderColor: 'warning.main',
        }}
      >
        <CardContent sx={{ pb: pendingRequests.length === 0 ? '16px !important' : undefined }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: pendingRequests.length > 0 ? 1.5 : 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceWalletIcon color="warning" fontSize="small" />
              <Typography variant="subtitle2" color="text.secondary">
                Cuentas por Pagar — Solicitudes aprobadas por Admin
              </Typography>
              {pendingRequests.length > 0 && (
                <Badge badgeContent={pendingRequests.length} color="warning" sx={{ ml: 1 }} />
              )}
            </Box>
            <Tooltip title="Actualizar lista" arrow>
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
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>

          {pendingRequests.length === 0 && (
            <Typography variant="subtitle2" color="text.disabled" sx={{ mt: 0.2 }}>
              No hay solicitudes de pago pendientes de Caja
            </Typography>
          )}

          {pendingRequests.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Estas solicitudes fueron aprobadas por el administrador. Haz clic en{' '}
                <strong>Registrar Pago</strong> para completar el pago y descontarlo de la caja activa.
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
            </>
          )}

          <Stack spacing={1.5}>
            {pendingRequests.map((req) => (
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
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={req.accountPayable?.apNumber ?? '—'}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      <Typography variant="body2" fontWeight={700} color="warning.main">
                        {formatCurrency(req.amount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        · {PAYMENT_METHOD_LABELS[req.paymentMethod] ?? req.paymentMethod}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary">
                        Solicitado por: {userName(req.requestedBy)}
                      </Typography>
                    </Box>

                    {req.reason && (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        Justificación: {req.reason}
                      </Typography>
                    )}

                    {req.adminNotes && (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        Notas admin: {req.adminNotes}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ flexShrink: 0 }}>
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      startIcon={<PaymentsIcon />}
                      onClick={() => setSelectedRequest(req)}
                      sx={{ minWidth: 130, fontSize: '0.75rem' }}
                    >
                      Registrar Pago
                    </Button>
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {selectedRequest && (
        <CajaApprovePaymentDialog
          open={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
          onApprove={async () => {
            await cajaApproveMutation.mutateAsync(selectedRequest.id);
          }}
          onReject={async (reason) => {
            await cajaRejectMutation.mutateAsync({ id: selectedRequest.id, reason });
          }}
          loading={cajaApproveMutation.isPending || cajaRejectMutation.isPending}
        />
      )}
    </>
  );
};

export default PendingApAuthorizationsPanel;
