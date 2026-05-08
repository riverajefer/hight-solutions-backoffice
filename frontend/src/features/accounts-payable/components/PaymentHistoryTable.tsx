import React, { useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import type { AccountPayablePayment } from '../../../types/accounts-payable.types';
import { PAYMENT_METHOD_LABELS } from '../../../types/expense-order.types';
import { formatCurrency } from '../../../utils/formatters';
import { storageApi } from '../../../api/storage.api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentHistoryTableProps {
  payments: AccountPayablePayment[];
  loading?: boolean;
  canDelete?: boolean;
  onDelete?: (paymentId: string) => void;
}

export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
  payments,
  loading,
  canDelete,
  onDelete,
}) => {
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const handleViewReceipt = async (payment: AccountPayablePayment) => {
    if (!payment.receiptFileId) return;
    setLoadingReceiptId(payment.id);
    try {
      const { url } = await storageApi.getFileUrl(payment.receiptFileId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setLoadingReceiptId(null);
    }
  };
  if (loading) {
    return (
      <Box sx={{ mt: 2 }}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  }

  if (payments.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No hay pagos registrados</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Fecha</TableCell>
            <TableCell align="right">Monto</TableCell>
            <TableCell>Método</TableCell>
            <TableCell>Referencia</TableCell>
            <TableCell>Registrado por</TableCell>
            <TableCell align="center">Comprobante</TableCell>
            {canDelete && <TableCell align="center">Acciones</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id} hover>
              <TableCell>
                {format(new Date(payment.paymentDate), 'dd MMM yyyy', { locale: es })}
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={600} color="success.main">
                  {formatCurrency(payment.amount)}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={
                    PAYMENT_METHOD_LABELS[payment.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ||
                    payment.paymentMethod
                  }
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {payment.reference || '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {[payment.registeredBy.firstName, payment.registeredBy.lastName]
                    .filter(Boolean)
                    .join(' ') || payment.registeredBy.email}
                </Typography>
              </TableCell>
              <TableCell align="center">
                {payment.receiptFileId ? (
                  <Tooltip title="Ver comprobante">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleViewReceipt(payment)}
                      disabled={loadingReceiptId === payment.id}
                    >
                      {loadingReceiptId === payment.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <ReceiptLongIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Typography variant="body2" color="text.disabled">—</Typography>
                )}
              </TableCell>
              {canDelete && onDelete && (
                <TableCell align="center">
                  <Tooltip title="Anular pago">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDelete(payment.id)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
