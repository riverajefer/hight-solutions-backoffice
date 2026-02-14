import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Discount as DiscountIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { OrderDiscount } from '../../../types/order.types';

const formatCurrency = (value: string): string => {
  const numValue = parseFloat(value);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
};

const formatDateTime = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const getUserName = (appliedBy: OrderDiscount['appliedBy']): string => {
  if (appliedBy.firstName || appliedBy.lastName) {
    return `${appliedBy.firstName || ''} ${appliedBy.lastName || ''}`.trim();
  }
  return appliedBy.email;
};

interface DiscountsSectionProps {
  discounts: OrderDiscount[];
  canDelete: boolean;
  onDelete?: (discountId: string) => void;
  isDeleting?: boolean;
}

export const DiscountsSection: React.FC<DiscountsSectionProps> = ({
  discounts,
  canDelete,
  onDelete,
  isDeleting = false,
}) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    discountId: string | null;
    discountAmount: string | null;
    discountReason: string | null;
  }>({
    open: false,
    discountId: null,
    discountAmount: null,
    discountReason: null,
  });

  const handleDeleteClick = (discount: OrderDiscount) => {
    setConfirmDialog({
      open: true,
      discountId: discount.id,
      discountAmount: discount.amount,
      discountReason: discount.reason,
    });
  };

  const handleConfirmDelete = () => {
    if (confirmDialog.discountId && onDelete) {
      onDelete(confirmDialog.discountId);
    }
    setConfirmDialog({
      open: false,
      discountId: null,
      discountAmount: null,
      discountReason: null,
    });
  };

  const handleCancelDelete = () => {
    setConfirmDialog({
      open: false,
      discountId: null,
      discountAmount: null,
      discountReason: null,
    });
  };
  if (discounts.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <DiscountIcon color="action" />
            <Typography variant="h6">Descuentos Aplicados</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            No se han aplicado descuentos a esta orden.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <DiscountIcon color="primary" />
          <Typography variant="h6">Descuentos Aplicados</Typography>
          <Chip
            label={discounts.length}
            size="small"
            color="primary"
            sx={{ ml: 'auto' }}
          />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Monto</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell>Aplicado por</TableCell>
                <TableCell>Fecha</TableCell>
                {canDelete && <TableCell align="center">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {discounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="error.main"
                    >
                      -{formatCurrency(discount.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{discount.reason}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getUserName(discount.appliedBy)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {discount.appliedBy.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDateTime(discount.appliedAt)}
                    </Typography>
                  </TableCell>
                  {canDelete && (
                    <TableCell align="center">
                      <Tooltip title="Eliminar descuento">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(discount)}
                          disabled={isDeleting}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Total de descuentos */}
        <Box
          sx={{
            mt: 2,
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Total descuentos:{' '}
            <Typography
              component="span"
              variant="subtitle1"
              fontWeight="bold"
              color="error.main"
            >
              -
              {formatCurrency(
                discounts
                  .reduce((sum, d) => sum + parseFloat(d.amount), 0)
                  .toString()
              )}
            </Typography>
          </Typography>
        </Box>
      </CardContent>

      {/* Dialog de confirmación */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Confirmar Eliminación de Descuento
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro que desea eliminar este descuento?
          </DialogContentText>
          {confirmDialog.discountAmount && confirmDialog.discountReason && (
            /* background according to theme, dark/light */
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, backgroundColor: 'background.paper', color: 'text.primary' }} >
              <Typography variant="body2" gutterBottom>
                <strong>Monto:</strong>{' '}
                <Typography
                  component="span"
                  color="error.main"
                  fontWeight="bold"
                >
                  {formatCurrency(confirmDialog.discountAmount)}
                </Typography>
              </Typography>
              <Typography variant="body2">
                <strong>Motivo:</strong> {confirmDialog.discountReason}
              </Typography>
            </Box>
          )}
          <DialogContentText sx={{ mt: 2, color: 'warning.main' }}>
            Esta acción recalculará el total de la orden y no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            autoFocus
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar Descuento'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
