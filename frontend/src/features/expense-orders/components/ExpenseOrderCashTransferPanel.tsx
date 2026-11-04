import React, { useState } from 'react';
import { Alert, AlertTitle, Button, Menu, MenuItem, ListItemText } from '@mui/material';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import { useExpenseOrderCashTransfers } from '../../../hooks/useCashTransferRequests';
import TransferMovementDialog from '../../cash-register/components/TransferMovementDialog';
import { formatDateTime } from '../../cash-register/utils/cashTransfer';
import { formatCurrency } from '../../../utils/formatters';

interface Props {
  expenseOrderId: string;
  /** Solo para OG pagadas y quien tiene el permiso. */
  enabled: boolean;
  /** Ítems sin comprobante: si hubo un traslado, se recomienda subirlo. */
  itemsWithoutReceipt: number;
}

/**
 * «El proveedor no recibió el pago»: pide trasladar un egreso en efectivo de
 * la OG desde su cierre (ya firmado) a la caja de hoy. Caso de origen:
 * OG-2026-0890 y 0917 (nov-2026).
 */
const ExpenseOrderCashTransferPanel: React.FC<Props> = ({
  expenseOrderId,
  enabled,
  itemsWithoutReceipt,
}) => {
  const { data: movements = [] } = useExpenseOrderCashTransfers(expenseOrderId, enabled);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [movementId, setMovementId] = useState<string | null>(null);

  if (!enabled || movements.length === 0) return null;

  const transferable = movements.filter((m) => !m.ineligibleReason && !m.pendingRequestId);
  const pending = movements.filter((m) => m.pendingRequestId);
  const applied = movements.filter((m) => m.appliedRequestId);

  const openFor = (event: React.MouseEvent<HTMLElement>) => {
    if (transferable.length === 1) {
      setMovementId(transferable[0].movement.id);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  return (
    <>
      {applied.length > 0 && itemsWithoutReceipt > 0 && (
        <Alert severity="info" icon={<SyncAltIcon />} sx={{ mt: 2 }}>
          <AlertTitle>Pago trasladado a otra caja</AlertTitle>
          {applied.map((m) => m.movement.receiptNumber).join(', ')} se pasó a la caja del día en que se
          entregó el dinero. Recomendado: sube el comprobante del pago en los ítems que no lo tienen.
        </Alert>
      )}

      {pending.length > 0 && (
        <Alert severity="info" icon={<SyncAltIcon />} sx={{ mt: 2 }}>
          Traslado a la caja de hoy pendiente de aprobación del administrador (
          {pending.map((m) => m.movement.receiptNumber).join(', ')}).
        </Alert>
      )}

      {transferable.length > 0 && (
        <Button
          size="small"
          variant="outlined"
          color="warning"
          startIcon={<SyncAltIcon />}
          onClick={openFor}
          sx={{ mt: 2 }}
        >
          El proveedor no recibió el pago
        </Button>
      )}

      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {transferable.map((m) => (
          <MenuItem
            key={m.movement.id}
            onClick={() => {
              setAnchorEl(null);
              setMovementId(m.movement.id);
            }}
          >
            <ListItemText
              primary={`${m.movement.receiptNumber} · ${formatCurrency(m.movement.amount)}`}
              secondary={`Pagado ${formatDateTime(m.movement.createdAt)}`}
            />
          </MenuItem>
        ))}
      </Menu>

      <TransferMovementDialog
        open={!!movementId}
        movementId={movementId}
        onClose={() => setMovementId(null)}
      />
    </>
  );
};

export default ExpenseOrderCashTransferPanel;
