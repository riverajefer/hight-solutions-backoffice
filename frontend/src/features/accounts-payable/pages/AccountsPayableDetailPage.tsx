import { useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  AlertTitle,
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
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { PageHeader } from '../../../components/common/PageHeader';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  AccountPayableStatus,
} from '../../../types/accounts-payable.types';
import { AccountPayableStatusChip } from '../components/AccountPayableStatusChip';
import { AccountPayableAuthRequestDialog } from '../components/AccountPayableAuthRequestDialog';
import { AttachmentsSection } from '../components/AttachmentsSection';
import { ExpenseOrderInfoSection } from '../components/ExpenseOrderInfoSection';
import { InstallmentScheduleSection } from '../components/InstallmentScheduleSection';
import { PaymentHistoryTable } from '../components/PaymentHistoryTable';
import { RegisterPaymentDialog } from '../components/RegisterPaymentDialog';
import { useAccountPayable } from '../hooks/useAccountsPayable';
import type { RegisterPaymentDto } from '../../../types/accounts-payable.types';
import { accountsPayableAuthRequestsApi } from '../../../api/accounts-payable-auth-requests.api';

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
  const [authRequestDialogOpen, setAuthRequestDialogOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data: myAuthRequests } = useQuery({
    queryKey: ['ap-auth-requests-mine', id],
    queryFn: () => accountsPayableAuthRequestsApi.findByUser(),
    enabled: !!id,
  });
  const hasPendingRequest = myAuthRequests?.some(
    (r) => r.accountPayableId === id && r.status === 'PENDING',
  ) ?? false;

  const {
    query,
    cancelMutation,
    registerPaymentMutation,
    deletePaymentMutation,
  } = useAccountPayable(id);

  const canUpdate = hasPermission(PERMISSIONS.UPDATE_ACCOUNTS_PAYABLE);
  const canDelete = hasPermission(PERMISSIONS.DELETE_ACCOUNTS_PAYABLE);
  const canRegisterPayment = hasPermission(PERMISSIONS.REGISTER_AP_PAYMENT);
  const canApprove = hasPermission(PERMISSIONS.APPROVE_ACCOUNTS_PAYABLE);

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
            {canRegisterPayment &&
              isEditable &&
              ap.status !== AccountPayableStatus.PENDING && (
                <Button
                  variant="contained"
                  startIcon={<PaymentIcon />}
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  Registrar Pago
                </Button>
              )}
            {canUpdate &&
              !canApprove &&
              ap.status === AccountPayableStatus.PENDING && (
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<HourglassTopIcon />}
                  onClick={() => setAuthRequestDialogOpen(true)}
                >
                  Solicitar Autorización
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

      {/* Banner contextual según estado y rol */}
      {ap.status === AccountPayableStatus.PENDING && !canApprove && !hasPendingRequest && (
        <Alert severity="warning" icon={<HourglassTopIcon />} sx={{ mt: 2, mb: 1 }}>
          <AlertTitle>Pendiente de autorización — acción requerida</AlertTitle>
          Esta Cuenta por Pagar requiere aprobación del administrador antes de poder registrar
          pagos. Haz clic en <strong>Solicitar Autorización</strong>: el administrador recibirá
          una notificación por WhatsApp y podrá aprobarla desde allí o desde{' '}
          <strong>Solicitudes Pendientes</strong>.
        </Alert>
      )}
      {ap.status === AccountPayableStatus.PENDING && !canApprove && hasPendingRequest && (
        <Alert
          severity="info"
          icon={<MarkEmailReadIcon />}
          sx={{
            mt: 2,
            mb: 1,
            borderLeft: '4px solid',
            borderColor: 'info.main',
          }}
        >
          <AlertTitle>Solicitud enviada — esperando respuesta de gerencia</AlertTitle>
          Tu solicitud fue enviada al administrador. Recibirá una notificación por{' '}
          <strong>WhatsApp</strong> y podrá aprobarla desde su celular o desde{' '}
          <strong>Solicitudes Pendientes</strong>. Te avisaremos cuando esté lista para pagar.
        </Alert>
      )}
      {ap.status === AccountPayableStatus.PENDING && canApprove && (
        <Alert severity="warning" icon={<AdminPanelSettingsIcon />} sx={{ mt: 2, mb: 1 }}>
          <AlertTitle>Requiere tu autorización administrativa</AlertTitle>
          Esta Cuenta por Pagar está pendiente de aprobación. Puedes autorizarla desde la
          sección <strong>Solicitudes Pendientes</strong> o respondiendo el mensaje de WhatsApp.
        </Alert>
      )}
      {ap.status === AccountPayableStatus.ADMIN_AUTHORIZED && canRegisterPayment && (
        <Alert severity="success" icon={<PaymentIcon />} sx={{ mt: 2, mb: 1 }}>
          <AlertTitle>Autorizada — lista para pagar</AlertTitle>
          El administrador autorizó esta Cuenta por Pagar. Usa el botón{' '}
          <strong>Registrar Pago</strong> para registrar un pago o abono y descontarlo de la
          caja activa.
        </Alert>
      )}
      {ap.status === AccountPayableStatus.ADMIN_AUTHORIZED && !canRegisterPayment && (
        <Alert severity="info" icon={<HourglassTopIcon />} sx={{ mt: 2, mb: 1 }}>
          <AlertTitle>Autorizada — esperando pago de Caja</AlertTitle>
          El administrador aprobó esta Cuenta por Pagar. El área de Caja puede registrar el
          pago. No se requiere ninguna acción de tu parte en este momento.
        </Alert>
      )}
      {ap.status === AccountPayableStatus.PAID && (
        <Alert severity="success" icon={<TaskAltIcon />} sx={{ mt: 2, mb: 1 }}>
          <AlertTitle>Pagada</AlertTitle>
          Esta Cuenta por Pagar fue pagada en su totalidad. El proceso está completo.
        </Alert>
      )}

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
                <InfoRow label="Tipo de Gasto" value={ap.expenseType?.name ?? 'N/A'} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <InfoRow label="Subcategoría" value={ap.expenseSubcategory?.name ?? 'N/A'} />
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
                        label={
                          ap.recurringFrequency === 'BIWEEKLY' ? 'Quincenal'
                          : ap.recurringFrequency === 'MONTHLY' ? 'Mensual'
                          : ap.recurringFrequency === 'SEMIANNUAL' ? 'Semestral'
                          : ap.recurringFrequency === 'ANNUAL' ? 'Anual'
                          : 'Recurrente'
                        }
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

      {/* Dialog de solicitud de autorización */}
      <AccountPayableAuthRequestDialog
        open={authRequestDialogOpen}
        onClose={() => setAuthRequestDialogOpen(false)}
        accountPayable={{ id: ap.id, apNumber: ap.apNumber, status: ap.status }}
      />

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
