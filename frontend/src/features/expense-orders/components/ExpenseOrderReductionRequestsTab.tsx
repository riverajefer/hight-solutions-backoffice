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
  useExpenseOrderReductionRequests,
  useReviewExpenseOrderReduction,
} from '../../../hooks/useExpenseOrderReductions';
import { formatCurrency } from '../../../utils/formatters';
import { formatDateTime } from '../../cash-register/utils/cashTransfer';
import type { ExpenseOrderReductionRequest } from '../../../types/expense-order-reduction.types';
import { ReductionPlanSummary } from './ExpenseOrderReductionDialog';

const userName = (u: ExpenseOrderReductionRequest['requestedBy'] | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—' : '—';

const STATUS: Record<
  ExpenseOrderReductionRequest['status'],
  { label: string; color: 'warning' | 'success' | 'error' | 'default' }
> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aplicada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
  EXPIRED: { label: 'Vencida', color: 'default' },
};

const WHERE: Record<ExpenseOrderReductionRequest['moneyLocation'], string> = {
  SUPPLIER_RETURNS: 'El proveedor la devuelve',
  NEVER_LEFT: 'Nunca salió de caja',
};

/**
 * Pestaña «Bajar valor de OG» de la bandeja. La revisa un admin distinto de
 * quien la pidió, viendo el valor nuevo y qué pasa con la caja.
 */
const ExpenseOrderReductionRequestsTab: React.FC<{ viewMode: 'pending' | 'history' }> = ({ viewMode }) => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data = [], isLoading } = useExpenseOrderReductionRequests(viewMode);
  const rows = viewMode === 'history' ? data.filter((r) => r.status !== 'PENDING') : data;
  const approveMutation = useReviewExpenseOrderReduction('approve');
  const rejectMutation = useReviewExpenseOrderReduction('reject');

  const [dialog, setDialog] = useState<{ request: ExpenseOrderReductionRequest; action: 'approve' | 'reject' } | null>(
    null,
  );
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState(false);

  const open = (request: ExpenseOrderReductionRequest, action: 'approve' | 'reject') => {
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
    await mutation.mutateAsync({ requestId: dialog.request.id, reviewNotes: notes.trim() || undefined });
    setDialog(null);
  });

  const columns: GridColDef<ExpenseOrderReductionRequest>[] = [
    { field: 'createdAt', headerName: 'Fecha', width: 150, renderCell: (p) => formatDateTime(p.value) },
    {
      field: 'og',
      headerName: 'OG',
      width: 140,
      valueGetter: (_v, row) => row.expenseOrder.ogNumber,
      renderCell: ({ row }) => <Link component={RouterLink} to={`/expense-orders/${row.expenseOrderId}`} color="primary.light" fontWeight={600}>{row.expenseOrder.ogNumber}</Link>,
    },
    {
      field: 'values',
      headerName: 'Valor',
      width: 200,
      sortable: false,
      renderCell: ({ row }) => `${formatCurrency(row.previousTotal)} → ${formatCurrency(row.newTotal)}`,
    },
    {
      field: 'difference',
      headerName: 'Diferencia',
      width: 120,
      renderCell: ({ row }) => formatCurrency(row.difference),
    },
    { field: 'moneyLocation', headerName: 'Dónde está', width: 170, valueGetter: (_v, row) => WHERE[row.moneyLocation] },
    { field: 'reason', headerName: 'Motivo', flex: 1, minWidth: 200 },
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
              <Button size="small" variant="contained" color="success" disabled={own} onClick={() => open(row, 'approve')}>
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
        <DialogTitle>{dialog?.action === 'approve' ? 'Aprobar: bajar el valor de la OG' : 'Rechazar: bajar el valor de la OG'}</DialogTitle>
        <DialogContent>
          {request && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>{userName(request.requestedBy)}</strong> pide bajar la{' '}
                <Link component={RouterLink} to={`/expense-orders/${request.expenseOrderId}`} color="primary.light" fontWeight={600}>{request.expenseOrder.ogNumber}</Link> de{' '}
                {formatCurrency(request.previousTotal)} a {formatCurrency(request.newTotal)}.
              </Typography>
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Motivo</Typography>
                <Typography variant="body2">{request.reason}</Typography>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                  Dónde está la diferencia: {WHERE[request.moneyLocation].toLowerCase()}.
                </Typography>
              </Box>

              {dialog?.action === 'approve' && (
                <>
                  {plan && !plan.ineligibleReason ? (
                    <ReductionPlanSummary plan={plan} />
                  ) : (
                    <Alert severity="error">{plan?.ineligibleReason ?? 'No se pudo calcular el efecto.'}</Alert>
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
            {dialog?.action === 'approve' ? 'Aprobar y aplicar' : 'Rechazar'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExpenseOrderReductionRequestsTab;
