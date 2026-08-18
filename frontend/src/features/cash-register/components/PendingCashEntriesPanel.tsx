import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { usePendingCashEntries } from '../hooks/useCashRegister';
import { formatCurrency } from '../../../utils/formatters';
import type { PendingCashEntry } from '../../../types/cash-register.types';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
  CREDIT: 'Crédito',
  OTHER: 'Otro',
};

const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <LocalAtmIcon fontSize="inherit" />,
  TRANSFER: <SyncAltIcon fontSize="inherit" />,
  CARD: <CreditCardIcon fontSize="inherit" />,
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const receivedByName = (entry: PendingCashEntry): string => {
  if (!entry.receivedBy) return '';
  const full = [entry.receivedBy.firstName, entry.receivedBy.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return full || entry.receivedBy.email;
};

/**
 * Aviso de los abonos que se cobraron sin caja abierta y van a entrar al arqueo
 * en cuanto se abra la sesión.
 *
 * Existe para que quien abre la caja no se encuentre con movimientos que no
 * registró: el dinero ya lo recibió una comercial fuera del horario de caja, y
 * el sistema lo ingresa solo al abrir. Sin este aviso, esos ingresos aparecen
 * "de la nada" en el arqueo.
 */
export const PendingCashEntriesPanel: React.FC = () => {
  const { data, isLoading } = usePendingCashEntries();
  const [expanded, setExpanded] = useState(false);

  // Sin cola no hay nada que avisar: no se ocupa espacio con un panel vacío.
  if (isLoading || !data || data.count === 0) return null;

  const { count, totalAmount, payments } = data;

  return (
    <Alert severity="info" icon={<LocalAtmIcon />}>
      <AlertTitle>
        {count === 1
          ? 'Hay 1 abono esperando entrar a caja'
          : `Hay ${count} abonos esperando entrar a caja`}
      </AlertTitle>

      <Typography variant="body2" sx={{ mb: 1 }}>
        Se cobraron sin caja abierta, por{' '}
        <strong>{formatCurrency(totalAmount)}</strong> en total. Al abrir la
        sesión entran automáticamente al arqueo, así que el saldo del sistema ya
        los va a incluir.
      </Typography>

      <Button
        size="small"
        onClick={() => setExpanded((v) => !v)}
        endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ px: 0 }}
      >
        {expanded ? 'Ocultar detalle' : 'Ver detalle'}
      </Button>

      <Collapse in={expanded}>
        <Stack spacing={1} sx={{ mt: 1 }} divider={<Divider flexItem />}>
          {payments.map((entry) => (
            <Box
              key={entry.id}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1,
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {entry.order?.orderNumber ?? 'OP sin número'}
                  {entry.reference ? ` · ${entry.reference}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(entry.paymentDate)}
                  {receivedByName(entry) ? ` · ${receivedByName(entry)}` : ''}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  icon={
                    (PAYMENT_METHOD_ICONS[entry.paymentMethod] as any) ??
                    undefined
                  }
                  label={
                    PAYMENT_METHOD_LABELS[entry.paymentMethod] ??
                    entry.paymentMethod
                  }
                />
                <Typography variant="body2" fontWeight={700}>
                  {formatCurrency(entry.amount)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Alert>
  );
};

export default PendingCashEntriesPanel;
