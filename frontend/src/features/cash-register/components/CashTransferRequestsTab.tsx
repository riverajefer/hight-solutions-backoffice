import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
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
import {
  useApproveCashTransferRequest,
  useCashTransferRequests,
  useRejectCashTransferRequest,
} from '../../../hooks/useCashTransferRequests';
import { PATHS } from '../../../router/paths';
import { formatCurrency } from '../../../utils/formatters';
import type { CashTransferRequest } from '../../../types/cash-transfer-request.types';
import { TransferEffectSummary } from './TransferMovementDialog';
import { formatDateTime, formatSigned, isIncomeMovement } from '../utils/cashTransfer';

const userName = (u: CashTransferRequest['requestedBy'] | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—' : '—';

const STATUS: Record<CashTransferRequest['status'], { label: string; color: 'warning' | 'success' | 'error' | 'default' }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aplicado', color: 'success' },
  REJECTED: { label: 'Rechazado', color: 'error' },
  EXPIRED: { label: 'Vencido', color: 'default' },
};

/**
 * Pestaña «Traslados de Caja» de la bandeja de solicitudes. El admin ve el
 * antes y el después del cierre de origen antes de decidir.
 */
const CashTransferRequestsTab: React.FC<{ viewMode: 'pending' | 'history' }> = ({ viewMode }) => {
  const { data = [], isLoading } = useCashTransferRequests(viewMode);
  const rows = viewMode === 'history' ? data.filter((r) => r.status !== 'PENDING') : data;
  const approveMutation = useApproveCashTransferRequest();
  const rejectMutation = useRejectCashTransferRequest();

  const [dialog, setDialog] = useState<{ request: CashTransferRequest; action: 'approve' | 'reject' } | null>(null);
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState(false);

  const open = (request: CashTransferRequest, action: 'approve' | 'reject') => {
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

  const columns: GridColDef<CashTransferRequest>[] = [
    { field: 'createdAt', headerName: 'Fecha', width: 150, renderCell: (p) => formatDateTime(p.value) },
    {
      field: 'receipt',
      headerName: 'Movimiento',
      width: 190,
      valueGetter: (_v, row) => row.cashMovement.receiptNumber,
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{row.cashMovement.receiptNumber}</Typography>
          <Typography variant="caption" color="text.secondary">
            {isIncomeMovement(row.cashMovement.movementType) ? 'Ingreso' : 'Egreso'} de {formatCurrency(row.cashMovement.amount)}
            {row.preview?.movement.expenseOrder ? ` · ${row.preview.movement.expenseOrder.ogNumber}` : ''}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'source',
      headerName: 'Cierre de origen',
      width: 170,
      valueGetter: (_v, row) => row.sourceSession.closedAt,
      renderCell: ({ row }) => (
        <Link to={PATHS.CASH_SESSION_HISTORY_DETAIL.replace(':id', row.sourceSessionId)}>
          {formatDateTime(row.sourceSession.closedAt)}
        </Link>
      ),
    },
    {
      field: 'effect',
      headerName: 'Diferencia del cierre',
      width: 190,
      sortable: false,
      renderCell: ({ row }) => {
        const before = row.status === 'PENDING' ? row.preview?.effect?.discrepancyBefore : row.sourceDiscrepancyBefore;
        const after = row.status === 'PENDING' ? row.preview?.effect?.discrepancyAfter : row.sourceDiscrepancyAfter;
        if (before == null || after == null) return '—';
        const worsens = Math.abs(Number(after)) > Math.abs(Number(before));
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2">{formatSigned(before)} → <strong>{formatSigned(after)}</strong></Typography>
            {worsens && <Chip label="Empeora" color="warning" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
          </Box>
        );
      },
    },
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
      renderCell: ({ row }) =>
        row.status === 'PENDING' ? (
          <Stack direction="row" spacing={1}>
            <Tooltip title={row.preview?.targetIssue ?? ''}>
              <span>
                <Button size="small" variant="contained" color="success" onClick={() => open(row, 'approve')}>
                  Revisar
                </Button>
              </span>
            </Tooltip>
            <Button size="small" variant="outlined" color="error" onClick={() => open(row, 'reject')}>
              Rechazar
            </Button>
          </Stack>
        ) : (
          userName(row.reviewedBy)
        ),
    },
  ];

  const request = dialog?.request;
  const preview = request?.preview;
  const isPending = approveMutation.isPending || rejectMutation.isPending;

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
          {dialog?.action === 'approve' ? 'Aprobar traslado a la caja de hoy' : 'Rechazar traslado'}
        </DialogTitle>
        <DialogContent>
          {request && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>{userName(request.requestedBy)}</strong> pide trasladar{' '}
                <strong>{request.cashMovement.receiptNumber}</strong> (
                {isIncomeMovement(request.cashMovement.movementType) ? 'ingreso' : 'egreso'} de{' '}
                {formatCurrency(request.cashMovement.amount)}
                {preview?.movement.expenseOrder ? `, ${preview.movement.expenseOrder.ogNumber}` : ''}) a la caja
                de hoy.
              </Typography>
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Motivo</Typography>
                <Typography variant="body2">{request.reason}</Typography>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                  Declaró que el dinero {isIncomeMovement(request.cashMovement.movementType)
                    ? 'llegó a la caja en la sesión siguiente'
                    : 'se quedó en la caja ese día'}.
                </Typography>
              </Box>

              {dialog?.action === 'approve' && (
                <>
                  {preview?.effect ? (
                    <TransferEffectSummary preview={preview} />
                  ) : (
                    <Alert severity="error">{preview?.ineligibleReason ?? 'No se pudo calcular el efecto del traslado.'}</Alert>
                  )}
                  {preview?.targetIssue && <Alert severity="error">{preview.targetIssue}</Alert>}
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
            disabled={dialog?.action === 'approve' && (!preview?.effect || !!preview?.targetIssue)}
            onClick={() => confirm()}
          >
            {dialog?.action === 'approve' ? 'Aprobar y aplicar' : 'Rechazar'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CashTransferRequestsTab;
