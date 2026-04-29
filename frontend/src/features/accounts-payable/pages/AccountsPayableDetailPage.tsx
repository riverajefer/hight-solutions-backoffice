import { useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { PageHeader } from '../../../components/common/PageHeader';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/formatters';
import {
  AccountPayableStatus,
  AP_PAYMENT_AUTH_STATUS_CONFIG,
} from '../../../types/accounts-payable.types';
import type { AccountPayablePaymentAuthRequest } from '../../../types/accounts-payable.types';
import { AccountPayableStatusChip } from '../components/AccountPayableStatusChip';
import { AttachmentsSection } from '../components/AttachmentsSection';
import { ExpenseOrderInfoSection } from '../components/ExpenseOrderInfoSection';
import { InstallmentScheduleSection } from '../components/InstallmentScheduleSection';
import { PaymentHistoryTable } from '../components/PaymentHistoryTable';
import { RequestPaymentDialog } from '../components/RequestPaymentDialog';
import { CajaApprovePaymentDialog } from '../components/CajaApprovePaymentDialog';
import { useAccountPayable, useApPaymentAuthRequests } from '../hooks/useAccountsPayable';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CREDIT: 'Crédito',
};

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
  const { hasPermission, user } = useAuthStore();

  const [requestPaymentOpen, setRequestPaymentOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Admin approve/reject inline state
  const [adminActionRequest, setAdminActionRequest] = useState<AccountPayablePaymentAuthRequest | null>(null);
  const [adminAction, setAdminAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Caja approve dialog
  const [cajaRequest, setCajaRequest] = useState<AccountPayablePaymentAuthRequest | null>(null);

  const {
    query,
    cancelMutation,
    deletePaymentMutation,
  } = useAccountPayable(id);

  const {
    paymentAuthRequestsQuery,
    createRequestMutation,
    adminApproveMutation,
    adminRejectMutation,
    cajaApproveMutation,
    cajaRejectMutation,
  } = useApPaymentAuthRequests(id);

  const canUpdate = hasPermission(PERMISSIONS.UPDATE_ACCOUNTS_PAYABLE);
  const canDelete = hasPermission(PERMISSIONS.DELETE_ACCOUNTS_PAYABLE);
  const canRequestPayment = hasPermission(PERMISSIONS.CREATE_ACCOUNTS_PAYABLE);
  const canAdminApprove = hasPermission(PERMISSIONS.APPROVE_ACCOUNTS_PAYABLE);
  const canCajaAuthorize = hasPermission(PERMISSIONS.CAJA_AUTHORIZE_AP_PAYMENT);

  const ap = query.data;
  const authRequests = paymentAuthRequestsQuery.data ?? [];

  const activePendingRequest = authRequests.find((r) => r.status === 'PENDING');
  const activeAdminApprovedRequest = authRequests.find((r) => r.status === 'ADMIN_APPROVED');
  const hasBlockingRequest = !!activePendingRequest || !!activeAdminApprovedRequest;

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    await cancelMutation.mutateAsync({ cancelReason });
    setConfirmCancel(false);
    setCancelReason('');
  };

  const handleAdminAction = async () => {
    if (!adminActionRequest) return;
    if (adminAction === 'approve') {
      await adminApproveMutation.mutateAsync({
        id: adminActionRequest.id,
        dto: { adminNotes: adminNotes || undefined },
      });
    } else {
      await adminRejectMutation.mutateAsync({
        id: adminActionRequest.id,
        dto: { adminNotes: adminNotes || undefined },
      });
    }
    setAdminActionRequest(null);
    setAdminAction(null);
    setAdminNotes('');
  };

  const openAdminAction = (req: AccountPayablePaymentAuthRequest, action: 'approve' | 'reject') => {
    setAdminActionRequest(req);
    setAdminAction(action);
    setAdminNotes('');
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
          <Stack direction="row" spacing={1} flexWrap="wrap">
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
            {canRequestPayment && isEditable && !hasBlockingRequest && (
              <Button
                variant="contained"
                startIcon={<PaymentIcon />}
                onClick={() => setRequestPaymentOpen(true)}
              >
                Solicitar Pago
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

      {/* Contextual banners */}
      {isEditable && !hasBlockingRequest && canRequestPayment && (
        <Alert severity="info" icon={<PaymentIcon />} sx={{ mt: 2, mb: 1 }}>
          <AlertTitle>Flujo de doble autorización</AlertTitle>
          Para registrar un pago usa <strong>Solicitar Pago</strong>. El administrador lo
          revisará en el paso 1 y Caja lo completará en el paso 2.
        </Alert>
      )}
      {activePendingRequest && !canAdminApprove && (
        <Alert severity="warning" icon={<HourglassTopIcon />} sx={{ mt: 2, mb: 1 }}>
          <AlertTitle>Solicitud enviada — esperando aprobación del administrador</AlertTitle>
          Tu solicitud de {formatCurrency(activePendingRequest.amount)} fue enviada. El
          administrador recibirá una notificación por <strong>WhatsApp</strong> y podrá
          aprobarla desde allí.
        </Alert>
      )}
      {activePendingRequest && canAdminApprove && (
        <Alert severity="warning" icon={<AdminPanelSettingsIcon />} sx={{ mt: 2, mb: 1 }}>
          <AlertTitle>Solicitud de pago pendiente de tu aprobación</AlertTitle>
          Hay una solicitud de {formatCurrency(activePendingRequest.amount)} esperando tu
          revisión. Apruébala o recházala en la sección de solicitudes abajo.
        </Alert>
      )}
      {activeAdminApprovedRequest && canCajaAuthorize && (
        <Alert severity="success" icon={<TaskAltIcon />} sx={{ mt: 2, mb: 1 }}>
          <AlertTitle>Aprobado por admin — listo para Caja</AlertTitle>
          Una solicitud de {formatCurrency(activeAdminApprovedRequest.amount)} fue aprobada
          por el administrador. Registra el pago usando el botón <strong>Registrar Pago</strong>{' '}
          en la sección de solicitudes abajo.
        </Alert>
      )}
      {activeAdminApprovedRequest && !canCajaAuthorize && (
        <Alert severity="info" icon={<HourglassTopIcon />} sx={{ mt: 2, mb: 1 }}>
          <AlertTitle>Aprobado — esperando confirmación de Caja</AlertTitle>
          El administrador aprobó la solicitud. Caja completará el registro del pago.
        </Alert>
      )}
      {ap.status === AccountPayableStatus.PAID && (
        <Alert severity="success" icon={<TaskAltIcon />} sx={{ mt: 2, mb: 1 }}>
          <AlertTitle>Pagada</AlertTitle>
          Esta Cuenta por Pagar fue pagada en su totalidad.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 0 }}>
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
                <Typography variant="body2" color="text.secondary">Total</Typography>
                <Typography variant="body2" fontWeight={600}>{formatCurrency(ap.totalAmount)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Abonado</Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">
                  {formatCurrency(ap.paidAmount)}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" fontWeight={600}>Saldo pendiente</Typography>
                <Typography variant="body2" fontWeight={700} color="warning.main">
                  {formatCurrency(ap.balance)}
                </Typography>
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Progreso</Typography>
                  <Typography variant="caption" color="text.secondary">{paidPercent.toFixed(0)}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={paidPercent}
                  sx={{ height: 8, borderRadius: 4 }}
                  color={
                    ap.status === AccountPayableStatus.PAID ? 'success'
                    : ap.status === AccountPayableStatus.OVERDUE ? 'error'
                    : 'primary'
                  }
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Solicitudes de Pago */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Solicitudes de Pago
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {paymentAuthRequestsQuery.isLoading ? (
              <Skeleton height={60} />
            ) : authRequests.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay solicitudes de pago registradas.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {authRequests.map((req) => {
                  const statusCfg = AP_PAYMENT_AUTH_STATUS_CONFIG[req.status];
                  const requesterName =
                    [req.requestedBy.firstName, req.requestedBy.lastName].filter(Boolean).join(' ') ||
                    req.requestedBy.email;
                  const isOwn = req.requestedById === user?.id;

                  return (
                    <Box
                      key={req.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 2,
                      }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        spacing={1}
                      >
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(req.amount)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              · {PAYMENT_METHOD_LABELS[req.paymentMethod] ?? req.paymentMethod}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              · {formatDate(req.paymentDate)}
                            </Typography>
                            <Chip
                              label={statusCfg.label}
                              color={statusCfg.color}
                              size="small"
                            />
                            {isOwn && (
                              <Chip label="Mi solicitud" size="small" variant="outlined" />
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Solicitado por {requesterName} · {formatDateTime(req.createdAt)}
                          </Typography>
                          {req.reason && (
                            <Typography variant="caption" color="text.secondary">
                              Justificación: {req.reason}
                            </Typography>
                          )}
                          {req.adminNotes && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Notas admin: {req.adminNotes}
                            </Typography>
                          )}
                          {req.cajaRejectionReason && (
                            <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                              Razón de rechazo (Caja): {req.cajaRejectionReason}
                            </Typography>
                          )}
                        </Box>

                        {/* Admin actions on PENDING */}
                        {req.status === 'PENDING' && canAdminApprove && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<CloseIcon />}
                              onClick={() => openAdminAction(req, 'reject')}
                            >
                              Rechazar
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => openAdminAction(req, 'approve')}
                            >
                              Aprobar
                            </Button>
                          </Stack>
                        )}

                        {/* Caja action on ADMIN_APPROVED */}
                        {req.status === 'ADMIN_APPROVED' && canCajaAuthorize && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PaymentIcon />}
                            onClick={() => setCajaRequest(req)}
                          >
                            Registrar Pago
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
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

      {/* Dialog: Solicitar Pago */}
      {requestPaymentOpen && (
        <RequestPaymentDialog
          open={requestPaymentOpen}
          onClose={() => setRequestPaymentOpen(false)}
          accountPayable={ap}
          onSubmit={async (dto) => {
            await createRequestMutation.mutateAsync(dto);
            setRequestPaymentOpen(false);
          }}
          loading={createRequestMutation.isPending}
        />
      )}

      {/* Dialog: Admin approve/reject */}
      <Dialog
        open={!!adminActionRequest}
        onClose={() => {
          if (!adminApproveMutation.isPending && !adminRejectMutation.isPending) {
            setAdminActionRequest(null);
            setAdminAction(null);
            setAdminNotes('');
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {adminAction === 'approve' ? 'Aprobar solicitud de pago' : 'Rechazar solicitud de pago'}
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {adminActionRequest && (
              <Alert severity={adminAction === 'approve' ? 'success' : 'warning'}>
                {adminAction === 'approve'
                  ? `Vas a aprobar el pago de ${formatCurrency(adminActionRequest.amount)}. Caja recibirá una notificación para completarlo.`
                  : `Vas a rechazar el pago de ${formatCurrency(adminActionRequest.amount)}.`}
              </Alert>
            )}
            <TextField
              label="Notas (opcional)"
              multiline
              rows={2}
              fullWidth
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setAdminActionRequest(null);
              setAdminAction(null);
              setAdminNotes('');
            }}
            disabled={adminApproveMutation.isPending || adminRejectMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={adminAction === 'approve' ? 'success' : 'error'}
            disabled={adminApproveMutation.isPending || adminRejectMutation.isPending}
            startIcon={
              (adminApproveMutation.isPending || adminRejectMutation.isPending)
                ? <CircularProgress size={16} />
                : adminAction === 'approve' ? <CheckCircleIcon /> : <CloseIcon />
            }
            onClick={handleAdminAction}
          >
            {adminAction === 'approve' ? 'Aprobar' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Caja approve */}
      {cajaRequest && (
        <CajaApprovePaymentDialog
          open={!!cajaRequest}
          onClose={() => setCajaRequest(null)}
          request={cajaRequest}
          onApprove={async () => {
            await cajaApproveMutation.mutateAsync(cajaRequest.id);
            setCajaRequest(null);
          }}
          onReject={async (reason) => {
            await cajaRejectMutation.mutateAsync({ id: cajaRequest.id, dto: { reason } });
            setCajaRequest(null);
          }}
          loading={cajaApproveMutation.isPending || cajaRejectMutation.isPending}
        />
      )}

      {/* Dialog: Anular */}
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
