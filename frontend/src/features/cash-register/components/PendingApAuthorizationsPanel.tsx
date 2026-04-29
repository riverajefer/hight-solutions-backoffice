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
import { accountsPayableApi } from '../../../api/accounts-payable.api';
import { AccountPayableStatus } from '../../../types/accounts-payable.types';
import type { AccountPayable, RegisterPaymentDto } from '../../../types/accounts-payable.types';
import { RegisterPaymentDialog } from '../../accounts-payable/components/RegisterPaymentDialog';

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(value));

const userName = (user?: { firstName?: string | null; lastName?: string | null; email: string } | null) => {
  if (!user) return '—';
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.email;
};

const PendingApAuthorizationsPanel: React.FC<{ hideWhenEmpty?: boolean }> = ({ hideWhenEmpty }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedAp, setSelectedAp] = useState<AccountPayable | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['accounts-payable', 'pending-caja'],
    queryFn: () =>
      accountsPayableApi.getAll({ status: AccountPayableStatus.ADMIN_AUTHORIZED, limit: 50 }),
    refetchInterval: 30_000,
  });

  const pendingAps = data?.data ?? [];

  const registerPaymentMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RegisterPaymentDto }) =>
      accountsPayableApi.registerPayment(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] });
      enqueueSnackbar('Pago registrado correctamente', { variant: 'success' });
      setSelectedAp(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al registrar el pago';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  const handleSubmitPayment = (dto: RegisterPaymentDto) => {
    if (!selectedAp) return;
    registerPaymentMutation.mutate({ id: selectedAp.id, dto });
  };

  if (isLoading) return null;
  if (hideWhenEmpty && pendingAps.length === 0) return null;

  return (
    <>
      <Card
        sx={{
          mb: 2,
          border: pendingAps.length > 0 ? '1px solid' : undefined,
          borderColor: 'warning.main',
        }}
      >
        <CardContent sx={{ pb: pendingAps.length === 0 ? '16px !important' : undefined }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: pendingAps.length > 0 ? 1.5 : 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceWalletIcon color="warning" fontSize="small" />
              <Typography variant="subtitle2" color="text.secondary">
                Cuentas por Pagar — Pendientes de Pago Caja
              </Typography>
              {pendingAps.length > 0 && (
                <Badge badgeContent={pendingAps.length} color="warning" sx={{ ml: 1 }} />
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

          {pendingAps.length === 0 && (
            <Typography variant="subtitle2" color="text.disabled" sx={{ mt: 0.2 }}>
              No hay cuentas por pagar pendientes de pago
            </Typography>
          )}

          {pendingAps.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Estas cuentas ya fueron autorizadas por el administrador. Haz clic en{' '}
                <strong>Registrar Pago</strong> para registrar el pago y descontarlo de la caja activa.
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
            </>
          )}

          <Stack spacing={1.5}>
            {pendingAps.map((ap) => (
              <Box
                key={ap.id}
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
                        label={ap.apNumber}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      {ap.supplier && (
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {ap.supplier.name}
                        </Typography>
                      )}
                    </Box>

                    {ap.description && (
                      <Typography variant="caption" color="text.secondary" display="block" mb={0.5} noWrap>
                        {ap.description}
                      </Typography>
                    )}

                    {(ap as any).authorizedBy && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          Autorizado por: {userName((ap as any).authorizedBy)}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <Box>
                        <Typography variant="caption" color="text.disabled">
                          Total
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(ap.totalAmount)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.disabled">
                          Saldo
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="warning.main">
                          {formatCurrency(ap.balance)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ flexShrink: 0 }}>
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      startIcon={<PaymentsIcon />}
                      onClick={() => setSelectedAp(ap)}
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

      {selectedAp && (
        <RegisterPaymentDialog
          open={!!selectedAp}
          onClose={() => setSelectedAp(null)}
          onSubmit={handleSubmitPayment}
          loading={registerPaymentMutation.isPending}
          accountPayable={selectedAp}
        />
      )}
    </>
  );
};

export default PendingApAuthorizationsPanel;
