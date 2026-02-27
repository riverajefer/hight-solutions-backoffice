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
  onTaxRateChange: _onTaxRateChange, // Ignorado ya que no se edita manualmente
  disabled = false,
}) => {
  // Calcular subtotal
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  // Calcular IVA
  const tax = applyTax ? subtotal * (taxRate / 100) : 0;

  // Calcular total
  const total = subtotal + tax + (requiresColorProof ? colorProofPrice : 0);

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
            <Stack spacing={2}>
              {/* Subtotal */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {formatCurrency(subtotal)}
                </Typography>
              </Box>

              {/* IVA */}
              {applyTax && (
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body1">
                    IVA ({taxRate}%):
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {formatCurrency(tax)}
                  </Typography>
                </Box>
              )}

              {/* Prueba de Color */}
              {requiresColorProof && (
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body1">
                    Prueba de Color:
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {formatCurrency(colorProofPrice)}
                  </Typography>
                </Box>
              )}

              <Divider />

              {/* Total */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h6" fontWeight={600}>
                  Total:
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  color="primary.main"
                >
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
