import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PaymentsIcon from '@mui/icons-material/Payments';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import {
  useExpenseOrderReductionsOf,
  useRegisterReductionRefund,
} from '../../../hooks/useExpenseOrderReductions';
import { formatCurrency } from '../../../utils/formatters';
import { formatDateTime } from '../../cash-register/utils/cashTransfer';
import {
  ExpenseOrderStatus,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  type ExpenseOrder,
} from '../../../types/expense-order.types';
import type { ExpenseOrderReductionRequest } from '../../../types/expense-order-reduction.types';
import ExpenseOrderReductionDialog from './ExpenseOrderReductionDialog';

const userName = (u?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—' : '—';

const pendingRefundOf = (requests: ExpenseOrderReductionRequest[]) =>
  requests.find((r) => r.status === 'APPROVED' && r.moneyLocation === 'SUPPLIER_RETURNS' && !r.refundReceivedAt);

/** Botón «Bajar valor» del encabezado de una OG pagada. Cualquiera puede pedirlo. */
export const ExpenseOrderReductionButton: React.FC<{ og: ExpenseOrder }> = ({ og }) => {
  const [open, setOpen] = useState(false);
  const { data: requests = [] } = useExpenseOrderReductionsOf(og.id);
  const blocked = requests.some((r) => r.status === 'PENDING') || !!pendingRefundOf(requests);

  if (og.status !== ExpenseOrderStatus.PAID || blocked) return null;

  return (
    <>
      <Button startIcon={<TrendingDownIcon />} size="small" variant="outlined" color="warning" onClick={() => setOpen(true)}>
        Bajar valor
      </Button>
      <ExpenseOrderReductionDialog open={open} og={og} onClose={() => setOpen(false)} />
    </>
  );
};

const REFUND_METHODS = Object.values(PaymentMethod).filter((m) => m !== PaymentMethod.CREDIT);

const RegisterRefundDialog: React.FC<{
  request: ExpenseOrderReductionRequest | null;
  onClose: () => void;
}> = ({ request, onClose }) => {
  const mutation = useRegisterReductionRefund();
  const [method, setMethod] = useState<string>(PaymentMethod.CASH);
  const [notes, setNotes] = useState('');

  const confirm = useSingleFlight(async () => {
    if (!request) return;
    await mutation.mutateAsync({ requestId: request.id, dto: { paymentMethod: method, notes: notes.trim() || undefined } });
    onClose();
  });

  return (
    <Dialog open={!!request} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Registrar reintegro</DialogTitle>
      <DialogContent>
        {request && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              El proveedor devuelve <strong>{formatCurrency(request.difference)}</strong> de la{' '}
              {request.expenseOrder.ogNumber}. Entra como ingreso a la caja abierta.
            </Typography>
            <TextField select label="¿Cómo lo devolvió?" value={method} onChange={(e) => setMethod(e.target.value)} fullWidth>
              {REFUND_METHODS.map((m) => (
                <MenuItem key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notas (opcional)"
              placeholder="Ej.: referencia de la transferencia"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
            />
            <Alert severity="info">Regístralo solo cuando el dinero esté en tus manos o en la cuenta.</Alert>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <LoadingButton variant="contained" loading={mutation.isPending} onClick={() => confirm()}>
          Registrar
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

/** Avisos de «bajar valor» en el detalle: pendiente de aprobar, reintegro por recibir o rechazo. */
export const ExpenseOrderReductionStatus: React.FC<{ og: ExpenseOrder; canRegisterRefund: boolean }> = ({
  og,
  canRegisterRefund,
}) => {
  const { data: requests = [] } = useExpenseOrderReductionsOf(og.id);
  const [refundFor, setRefundFor] = useState<ExpenseOrderReductionRequest | null>(null);
  const pending = requests.find((r) => r.status === 'PENDING');
  const refund = pendingRefundOf(requests);
  const latest = requests[0];

  return (
    <>
      {pending && (
        <Alert severity="warning" icon={<HourglassTopIcon />} sx={{ mt: 2 }}>
          <AlertTitle>Bajar valor solicitado — esperando a un administrador</AlertTitle>
          {userName(pending.requestedBy)} pidió bajarla de {formatCurrency(pending.previousTotal)} a{' '}
          {formatCurrency(pending.newTotal)} el {formatDateTime(pending.createdAt)}
          <br />
          <strong>Motivo:</strong> {pending.reason}
        </Alert>
      )}

      {refund && (
        <Alert
          severity="warning"
          icon={<PaymentsIcon />}
          sx={{ mt: 2 }}
          action={
            canRegisterRefund ? (
              <Button color="inherit" size="small" onClick={() => setRefundFor(refund)}>
                Registrar reintegro
              </Button>
            ) : undefined
          }
        >
          <AlertTitle>Reintegro pendiente: {formatCurrency(refund.difference)}</AlertTitle>
          El valor bajó de {formatCurrency(refund.previousTotal)} a {formatCurrency(refund.newTotal)}. El proveedor debe
          devolver la diferencia y Caja la registra cuando la reciba.
        </Alert>
      )}

      {!pending && !refund && latest?.status === 'REJECTED' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Se rechazó bajar el valor pedido el {formatDateTime(latest.createdAt)}
          {latest.reviewNotes ? `: ${latest.reviewNotes}` : ''}
        </Alert>
      )}

      <RegisterRefundDialog request={refundFor} onClose={() => setRefundFor(null)} />
    </>
  );
};
