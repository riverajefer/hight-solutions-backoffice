import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Checkbox,
  FormControlLabel,
  Divider,
  Stack,
} from '@mui/material';
import type { OrderItemRow } from '../../../types/order.types';

interface OrderTotalsProps {
  items: OrderItemRow[];
  applyTax: boolean;
  taxRate: number;
  requiresColorProof?: boolean;
  colorProofPrice?: number;
  onApplyTaxChange: (value: boolean) => void;
  onTaxRateChange: (value: number) => void;
  disabled?: boolean;
  applyWithholdings?: boolean;
  retefuenteRate?: number;
  reteICARate?: number;
  reteIVARate?: number;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const OrderTotals: React.FC<OrderTotalsProps> = ({
  items,
  applyTax,
  taxRate,
  requiresColorProof = false,
  colorProofPrice = 0,
  onApplyTaxChange,
  onTaxRateChange: _onTaxRateChange,
  disabled = false,
  applyWithholdings = false,
  retefuenteRate = 0,
  reteICARate = 0,
  reteIVARate = 0,
}) => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  const retefuenteAmount = applyWithholdings && retefuenteRate > 0 ? subtotal * (retefuenteRate / 100) : 0;
  const reteICAAmount = applyWithholdings && reteICARate > 0 ? subtotal * (reteICARate / 100) : 0;
  const tax = applyTax ? subtotal * (taxRate / 100) : 0;
  const reteIVAAmount = applyWithholdings && reteIVARate > 0 && applyTax ? tax * (reteIVARate / 100) : 0;

  const hasRetenciones = applyWithholdings && (retefuenteAmount > 0 || reteICAAmount > 0);
  const subtotalAfterRetenciones = subtotal - retefuenteAmount - reteICAAmount;

  const total =
    subtotal - retefuenteAmount - reteICAAmount + tax - reteIVAAmount + (requiresColorProof ? colorProofPrice : 0);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          IVA
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          {/* Configuración de IVA */}
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={applyTax}
                  onChange={(e) => onApplyTaxChange(e.target.checked)}
                  disabled={disabled}
                />
              }
              label={
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Aplicar IVA
                </Typography>
              }
            />
          </Grid>

          {/* Totales */}
          <Grid item xs={12} md={6}>
            <Stack spacing={1.5}>
              {/* Subtotal */}
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {formatCurrency(subtotal)}
                </Typography>
              </Box>

              {/* Retefuente */}
              {retefuenteAmount > 0 && (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1">Retefuente ({retefuenteRate}%):</Typography>
                  <Typography variant="body1" fontWeight={500} color="error.main">
                    - {formatCurrency(retefuenteAmount)}
                  </Typography>
                </Box>
              )}

              {/* ReteICA */}
              {reteICAAmount > 0 && (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1">ReteICA ({reteICARate}%):</Typography>
                  <Typography variant="body1" fontWeight={500} color="error.main">
                    - {formatCurrency(reteICAAmount)}
                  </Typography>
                </Box>
              )}

              {/* Subtotal después de retenciones pre-IVA */}
              {hasRetenciones && (
                <>
                  <Divider />
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Subtotal s/retenciones:
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatCurrency(subtotalAfterRetenciones)}
                    </Typography>
                  </Box>
                </>
              )}

              {/* IVA */}
              {applyTax && (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1">IVA ({taxRate}%):</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {formatCurrency(tax)}
                  </Typography>
                </Box>
              )}

              {/* ReteIVA */}
              {reteIVAAmount > 0 && (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1">ReteIVA ({reteIVARate}%):</Typography>
                  <Typography variant="body1" fontWeight={500} color="error.main">
                    - {formatCurrency(reteIVAAmount)}
                  </Typography>
                </Box>
              )}

              {/* Prueba de Color */}
              {requiresColorProof && (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1">Prueba de Color:</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {formatCurrency(colorProofPrice)}
                  </Typography>
                </Box>
              )}

              <Divider />

              {/* Total */}
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={600}>
                  Total:
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {formatCurrency(total)}
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
