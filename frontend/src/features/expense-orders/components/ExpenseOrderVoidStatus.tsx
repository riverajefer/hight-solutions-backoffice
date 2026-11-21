import React, { useState } from 'react';
import { Alert, AlertTitle, Button } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { useExpenseOrderVoidRequestsOf } from '../../../hooks/useExpenseOrderVoidRequests';
import { formatDateTime } from '../../cash-register/utils/cashTransfer';
import { ExpenseOrderStatus, type ExpenseOrder } from '../../../types/expense-order.types';
import ExpenseOrderVoidDialog from './ExpenseOrderVoidDialog';

const userName = (u?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—' : '—';

/** Botón «Solicitar anulación» del encabezado de la OG. Cualquiera puede pedirla. */
export const ExpenseOrderVoidButton: React.FC<{ og: ExpenseOrder }> = ({ og }) => {
  const [open, setOpen] = useState(false);
  const { data: requests = [] } = useExpenseOrderVoidRequestsOf(og.id);
  const pending = requests.some((r) => r.status === 'PENDING');

  if (og.status === ExpenseOrderStatus.VOIDED || pending) return null;

  return (
    <>
      <Button
        startIcon={<BlockIcon />}
        size="small"
        variant="outlined"
        color="error"
        onClick={() => setOpen(true)}
      >
        Solicitar anulación
      </Button>
      <ExpenseOrderVoidDialog open={open} expenseOrderId={og.id} onClose={() => setOpen(false)} />
    </>
  );
};

/** Avisos de anulación en el detalle: pendiente, rechazada o ya anulada. */
export const ExpenseOrderVoidStatus: React.FC<{ og: ExpenseOrder }> = ({ og }) => {
  const { data: requests = [] } = useExpenseOrderVoidRequestsOf(og.id);
  const pending = requests.find((r) => r.status === 'PENDING');
  const lastRejected = requests.find((r) => r.status === 'REJECTED');

  if (og.status === ExpenseOrderStatus.VOIDED) {
    const applied = requests.find((r) => r.status === 'APPROVED');
    return (
      <Alert severity="error" icon={<BlockIcon />} sx={{ mt: 2 }}>
        <AlertTitle>OG anulada</AlertTitle>
        {og.voidReason && (
          <>
            <strong>Motivo:</strong> {og.voidReason}
            <br />
          </>
        )}
        {applied && (
          <>
            Pidió: {userName(applied.requestedBy)} · Aprobó: {userName(og.voidedBy ?? applied.reviewedBy)} ·{' '}
            {formatDateTime(og.voidedAt ?? applied.reviewedAt)}
            <br />
          </>
        )}
        Sus egresos de caja y su cuenta por pagar quedaron anulados. Ya no cuenta como costo.
      </Alert>
    );
  }

  if (pending) {
    return (
      <Alert severity="warning" icon={<HourglassTopIcon />} sx={{ mt: 2 }}>
        <AlertTitle>Anulación solicitada — esperando a un administrador</AlertTitle>
        {userName(pending.requestedBy)} la pidió el {formatDateTime(pending.createdAt)}
        <br />
        <strong>Motivo:</strong> {pending.reason}
      </Alert>
    );
  }

  if (lastRejected && !requests.some((r) => r.status === 'APPROVED')) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Se rechazó la anulación pedida el {formatDateTime(lastRejected.createdAt)}
        {lastRejected.reviewNotes ? `: ${lastRejected.reviewNotes}` : '.'}
      </Alert>
    );
  }

  return null;
};
