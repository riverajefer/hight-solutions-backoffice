import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Link,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '../../../components/common/DataTable';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { useAuthStore } from '../../../store/authStore';
import {
  useApproveExpenseOrderVoidRequest,
  useExpenseOrderVoidRequests,
  useRejectExpenseOrderVoidRequest,
} from '../../../hooks/useExpenseOrderVoidRequests';
import { formatCurrency } from '../../../utils/formatters';
import { formatDateTime } from '../../cash-register/utils/cashTransfer';
import type { ExpenseOrderVoidRequest } from '../../../types/expense-order-void-request.types';
import ExpenseOrderVoidPlanSummary from './ExpenseOrderVoidPlanSummary';

const userName = (u: ExpenseOrderVoidRequest['requestedBy'] | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—' : '—';

const STATUS: Record<
  ExpenseOrderVoidRequest['status'],
  { label: string; color: 'warning' | 'success' | 'error' | 'default' }
> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Anulada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
  EXPIRED: { label: 'Vencida', color: 'default' },
};

const moneyOf = (request: ExpenseOrderVoidRequest) =>
  (request.plan?.movements ?? []).reduce((sum, m) => sum + Number(m.amount), 0);

/**
 * Pestaña «Anulación de OG» de la bandeja de solicitudes. La revisa un admin
 * distinto de quien la pidió, viendo qué egresos, cierres, CP y rollos toca.
 */
const ExpenseOrderVoidRequestsTab: React.FC<{ viewMode: 'pending' | 'history' }> = ({ viewMode }) => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data = [], isLoading } = useExpenseOrderVoidRequests(viewMode);
  const rows = viewMode === 'history' ? data.filter((r) => r.status !== 'PENDING') : data;
  const approveMutation = useApproveExpenseOrderVoidRequest();
  const rejectMutation = useRejectExpenseOrderVoidRequest();

  const [dialog, setDialog] = useState<{ request: ExpenseOrderVoidRequest; action: 'approve' | 'reject' } | null>(
    null,
  );
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState(false);

  const open = (request: ExpenseOrderVoidRequest, action: 'approve' | 'reject') => {
    setDialog({ request, action });
    setNotes('');
    setNotesError(false);
  };

  const confirm = useSingleFlight(async () => {
    if (!dialog) return;
    if (dialog.action === 'reject' && !notes.trim()) {
      setNotesError(true);
      return;
    }
    const mutation = dialog.action === 'approve' ? approveMutation : rejectMutation;
    await mutation.mutateAsync({ requestId: dialog.request.id, dto: { reviewNotes: notes.trim() || undefined } });
    setDialog(null);
  });

  const columns: GridColDef<ExpenseOrderVoidRequest>[] = [
    { field: 'createdAt', headerName: 'Fecha', width: 150, renderCell: (p) => formatDateTime(p.value) },
    {
      field: 'og',
      headerName: 'OG',
      width: 140,
      valueGetter: (_v, row) => row.expenseOrder.ogNumber,
      renderCell: ({ row }) => <Link component={RouterLink} to={`/expense-orders/${row.expenseOrderId}`} color="primary.light" fontWeight={600}>{row.expenseOrder.ogNumber}</Link>,
    },
    {
      field: 'money',
      headerName: 'Egresos a anular',
      width: 150,
      sortable: false,
      renderCell: ({ row }) => {
        if (!row.plan) return '—';
        return row.plan.movements.length === 0 ? 'Sin egresos' : formatCurrency(moneyOf(row));
      },
    },
    { field: 'reason', headerName: 'Motivo', flex: 1, minWidth: 220 },
    { field: 'requestedBy', headerName: 'Solicitó', width: 150, valueGetter: (_v, row) => userName(row.requestedBy) },
    {
      field: 'status',
      headerName: 'Estado',
      width: 110,
      renderCell: ({ row }) => <Chip size="small" label={STATUS[row.status].label} color={STATUS[row.status].color} />,
    },
    {
      field: 'actions',
      headerName: viewMode === 'pending' ? 'Acciones' : 'Revisó',
      width: viewMode === 'pending' ? 190 : 160,
      sortable: false,
      renderCell: ({ row }) => {
        if (row.status !== 'PENDING') return userName(row.reviewedBy);
        const own = row.requestedById === currentUserId;
        return (
          <Tooltip title={own ? 'La pediste tú: debe revisarla otro administrador' : ''}>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                color="success"
                disabled={own}
                onClick={() => open(row, 'approve')}
              >
                Revisar
              </Button>
              <Button size="small" variant="outlined" color="error" disabled={own} onClick={() => open(row, 'reject')}>
                Rechazar
              </Button>
            </Stack>
          </Tooltip>
        );
      },
    },
  ];

  const request = dialog?.request;
  const plan = request?.plan;
  const isPending = approveMutation.isPending || rejectMutation.isPending;
  const approveBlocked = !plan || !!plan.ineligibleReason || !!plan.applyIssue;

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.id}
        density="compact"
        pageSize={20}
        pageSizeOptions={[20, 50, 100]}
      />

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog?.action === 'approve' ? 'Aprobar anulación de OG' : 'Rechazar anulación de OG'}
        </DialogTitle>
        <DialogContent>
          {request && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>{userName(request.requestedBy)}</strong> pide anular la{' '}
                <Link component={RouterLink} to={`/expense-orders/${request.expenseOrderId}`} color="primary.light" fontWeight={600}>{request.expenseOrder.ogNumber}</Link>.
              </Typography>
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Motivo</Typography>
                <Typography variant="body2">{request.reason}</Typography>
                {request.cashStayedInDrawer && (
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                    Declaró que el dinero sigue en la empresa (no lo tiene el proveedor).
                  </Typography>
                )}
              </Box>

              {dialog?.action === 'approve' && (
                <>
                  {plan && !plan.ineligibleReason ? (
                    <ExpenseOrderVoidPlanSummary plan={plan} />
                  ) : (
                    <Alert severity="error">{plan?.ineligibleReason ?? 'No se pudo calcular qué toca la anulación.'}</Alert>
                  )}
                  {plan?.applyIssue && <Alert severity="error">{plan.applyIssue}</Alert>}
                </>
              )}

              <TextField
                label={dialog?.action === 'reject' ? 'Motivo del rechazo' : 'Notas (opcional)'}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesError(false);
                }}
                multiline
                minRows={2}
                fullWidth
                required={dialog?.action === 'reject'}
                error={notesError}
                helperText={notesError ? 'Escribe el motivo del rechazo' : undefined}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancelar</Button>
          <LoadingButton
            variant="contained"
            color={dialog?.action === 'approve' ? 'success' : 'error'}
            loading={isPending}
            disabled={dialog?.action === 'approve' && approveBlocked}
            onClick={() => confirm()}
          >
            {dialog?.action === 'approve' ? 'Aprobar y anular' : 'Rechazar'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExpenseOrderVoidRequestsTab;
