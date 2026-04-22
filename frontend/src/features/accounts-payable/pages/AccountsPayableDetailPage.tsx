import { useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PaymentIcon from '@mui/icons-material/Payment';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { PageHeader } from '../../../components/common/PageHeader';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  AccountPayableStatus,
  ACCOUNT_PAYABLE_TYPE_LABELS,
} from '../../../types/accounts-payable.types';
import { AccountPayableStatusChip } from '../components/AccountPayableStatusChip';
import { AttachmentsSection } from '../components/AttachmentsSection';
import { ExpenseOrderInfoSection } from '../components/ExpenseOrderInfoSection';
import { InstallmentScheduleSection } from '../components/InstallmentScheduleSection';
import { PaymentHistoryTable } from '../components/PaymentHistoryTable';
import { RegisterPaymentDialog } from '../components/RegisterPaymentDialog';
import { useAccountPayable } from '../hooks/useAccountsPayable';
import type { RegisterPaymentDto } from '../../../types/accounts-payable.types';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

export default function AccountsPayableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const {
    query,
    cancelMutation,
    registerPaymentMutation,
    deletePaymentMutation,
  } = useAccountPayable(id);

  const canUpdate = hasPermission(PERMISSIONS.UPDATE_ACCOUNTS_PAYABLE);
  const canDelete = hasPermission(PERMISSIONS.DELETE_ACCOUNTS_PAYABLE);
  const canRegisterPayment = hasPermission(PERMISSIONS.REGISTER_AP_PAYMENT);

  const ap = query.data;

  const handleRegisterPayment = async (dto: RegisterPaymentDto) => {
    await registerPaymentMutation.mutateAsync(dto);
    setPaymentDialogOpen(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    await cancelMutation.mutateAsync({ cancelReason });
    setConfirmCancel(false);
    setCancelReason('');
  };

  if (query.isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton height={60} sx={{ mb: 2 }} />
        <Skeleton height={200} />
      </Box>
    );
  }

  if (!ap) return null;

  const paidPercent = Math.min(
    100,
    (Number(ap.paidAmount) / Number(ap.totalAmount)) * 100,
  );

  const isEditable =
    ap.status !== AccountPayableStatus.PAID &&
    ap.status !== AccountPayableStatus.CANCELLED;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title={ap.apNumber}
        subtitle={ap.description}
        breadcrumbs={[
          { label: 'Cuentas por Pagar', path: ROUTES.ACCOUNTS_PAYABLE },
          { label: ap.apNumber },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(ROUTES.ACCOUNTS_PAYABLE)}
            >
              Volver
            </Button>
            {canUpdate && isEditable && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(ROUTES.ACCOUNTS_PAYABLE_EDIT.replace(':id', ap.id))}
              >
                Editar
              </Button>
            )}
            {canRegisterPayment && isEditable && (
              <Button
                variant="contained"
                startIcon={<PaymentIcon />}
                onClick={() => setPaymentDialogOpen(true)}
              >
                Registrar Pago
              </Button>
            )}
            {canDelete && isEditable && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelOutlinedIcon />}
                onClick={() => setConfirmCancel(true)}
              >
                Anular
              </Button>
            )}
          </Stack>
        }
      />

      <Grid container spacing={3}>
        {/* Información principal */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Información General
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <InfoRow label="Número" value={ap.apNumber} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <InfoRow
                  label="Estado"
                  value={<AccountPayableStatusChip status={ap.status} />}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <InfoRow label="Tipo" value={ACCOUNT_PAYABLE_TYPE_LABELS[ap.type]} />
              </Grid>
              <Grid item xs={12} sm={8}>
                <InfoRow label="Descripción" value={ap.description} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <InfoRow label="Fecha Vencimiento" value={formatDate(ap.dueDate)} />
              </Grid>
              {ap.supplier && (
                <Grid item xs={12} sm={6}>
                  <InfoRow label="Proveedor" value={ap.supplier.name} />
                </Grid>
              )}
              {ap.expenseOrder && (
                <Grid item xs={12} sm={6}>
                  <InfoRow
                    label="Orden de Gasto"
                    value={
                      <Box
                        component={RouterLink}
                        to={ROUTES.EXPENSE_ORDERS_DETAIL?.replace(':id', ap.expenseOrder.id) ?? '#'}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          color: 'primary.main',
                          textDecoration: 'none',
                        }}
                      >
                        {ap.expenseOrder.ogNumber}
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </Box>
                    }
                  />
                </Grid>
              )}
              {ap.observations && (
                <Grid item xs={12}>
                  <InfoRow label="Observaciones" value={ap.observations} />
                </Grid>
              )}
              {ap.isRecurring && (
                <Grid item xs={12} sm={6}>
                  <InfoRow
                    label="Pago recurrente"
                    value={
                      <Chip
                        label={`Día ${ap.recurringDay} de cada mes`}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    }
                  />
                </Grid>
              )}
              {ap.status === AccountPayableStatus.CANCELLED && (
                <>
                  <Grid item xs={12} sm={6}>
                    <InfoRow label="Anulada el" value={ap.cancelledAt ? formatDate(ap.cancelledAt) : '—'} />
                  </Grid>
                  <Grid item xs={12}>
                    <InfoRow label="Razón de anulación" value={ap.cancelReason} />
                  </Grid>
                </>
              )}
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Creada por{' '}
                {[ap.createdBy.firstName, ap.createdBy.lastName].filter(Boolean).join(' ') ||
                  ap.createdBy.email}{' '}
                el {formatDate(ap.createdAt)}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Panel de pagos */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Estado del Pago
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(ap.totalAmount)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Abonado
                </Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">
                  {formatCurrency(ap.paidAmount)}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" fontWeight={600}>
                  Saldo pendiente
                </Typography>
                <Typography variant="body2" fontWeight={700} color="warning.main">
                  {formatCurrency(ap.balance)}
                </Typography>
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Progreso
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {paidPercent.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={paidPercent}
                  sx={{ height: 8, borderRadius: 4 }}
                  color={
                    ap.status === AccountPayableStatus.PAID
                      ? 'success'
                      : ap.status === AccountPayableStatus.OVERDUE
                        ? 'error'
                        : 'primary'
                  }
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Orden de Gasto vinculada */}
        {ap.expenseOrder && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <ExpenseOrderInfoSection expenseOrder={ap.expenseOrder} />
            </Paper>
          </Grid>
        )}

        {/* Historial de pagos */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Historial de Pagos
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <PaymentHistoryTable
              payments={ap.payments ?? []}
              loading={query.isLoading}
              canDelete={canDelete}
              onDelete={(paymentId) => deletePaymentMutation.mutate(paymentId)}
            />
          </Paper>
        </Grid>

        {/* Plan de Cuotas y Adjuntos */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <InstallmentScheduleSection
              accountPayable={ap}
              canEdit={canUpdate && isEditable}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <AttachmentsSection
              accountPayable={ap}
              canEdit={canUpdate && isEditable}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog de pago */}
      {paymentDialogOpen && (
        <RegisterPaymentDialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          onSubmit={handleRegisterPayment}
          loading={registerPaymentMutation.isPending}
          accountPayable={ap}
        />
      )}

      {/* Dialog de anulación */}
      <Dialog
        open={confirmCancel}
        onClose={() => {
          setConfirmCancel(false);
          setCancelReason('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Anular Cuenta por Pagar</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">Esta acción no se puede deshacer.</Alert>
            <TextField
              label="Razón de la anulación *"
              multiline
              rows={2}
              fullWidth
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setConfirmCancel(false);
              setCancelReason('');
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!cancelReason.trim() || cancelMutation.isPending}
            onClick={handleCancel}
          >
            Anular
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
