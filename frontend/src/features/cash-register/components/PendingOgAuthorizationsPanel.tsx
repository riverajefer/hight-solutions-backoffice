import React from 'react';
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
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { expenseOrdersApi } from '../../../api/expense-orders.api';
import { ExpenseOrderStatus } from '../../../types/expense-order.types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

const userName = (user?: { firstName?: string | null; lastName?: string | null; email: string } | null) => {
  if (!user) return '—';
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.email;
};

const PendingOgAuthorizationsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const { data: pendingData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['expense-orders', 'pending-caja'],
    queryFn: () => expenseOrdersApi.getAll({ status: ExpenseOrderStatus.ADMIN_AUTHORIZED, limit: 50 }),
    refetchInterval: 30_000,
  });

  const pendingOgs = pendingData?.data ?? [];

  const cajaAuthorizeMutation = useMutation({
    mutationFn: (ogId: string) => expenseOrdersApi.cajaAuthorize(ogId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-orders', 'pending-caja'] });
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] });
      enqueueSnackbar('OG autorizada por Caja y pagada correctamente', { variant: 'success' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al autorizar la OG';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

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
    <Card
      sx={{
        mb: 2,
        border: pendingOgs.length > 0 ? '1px solid' : undefined,
        borderColor: 'success.main',
      }}
    >
      <CardContent sx={{ pb: pendingOgs.length === 0 ? '16px !important' : undefined }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: pendingOgs.length > 0 ? 1.5 : 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongIcon color="success" fontSize="small" />
            <Typography variant="subtitle2" color="text.secondary">
              Órdenes de Gasto — Pendientes de Firma Caja
            </Typography>
            {pendingOgs.length > 0 && (
              <Badge badgeContent={pendingOgs.length} color="success" sx={{ ml: 1 }} />
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

        {pendingOgs.length === 0 && (
          <Typography variant="subtitle2" color="text.disabled" sx={{ mt: 0.2 }}>
            No hay órdenes de gasto pendientes de firma
          </Typography>
        )}

        {pendingOgs.length > 0 && <Divider sx={{ mb: 1.5 }} />}

        <Stack spacing={1.5}>
          {pendingOgs.map((og) => {
            const total = og.items.reduce((acc, item) => acc + parseFloat(item.total), 0);
            const isPending = cajaAuthorizeMutation.isPending && cajaAuthorizeMutation.variables === og.id;

            return (
              <Box
                key={og.id}
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
                    {/* OG Number + Expense Type */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={og.ogNumber}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {og.expenseType.name}
                      </Typography>
                    </Box>

                    {/* Subcategory */}
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                      {og.expenseSubcategory.name}
                    </Typography>

                    {/* Pre-authorized by (Admin) */}
                    {og.authorizedBy && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          Pre-autorizado por: {userName(og.authorizedBy)}
                        </Typography>
                      </Box>
                    )}

                    {/* Total */}
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      {formatCurrency(total)}
                    </Typography>
                  </Box>

                  {/* Action button */}
                  <Box sx={{ flexShrink: 0 }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon />}
                      onClick={() => cajaAuthorizeMutation.mutate(og.id)}
                      disabled={cajaAuthorizeMutation.isPending}
                      sx={{ minWidth: 110, fontSize: '0.75rem' }}
                    >
                      {isPending ? 'Autorizando...' : 'Autorizar'}
                    </Button>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PendingOgAuthorizationsPanel;
