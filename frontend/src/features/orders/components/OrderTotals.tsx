import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Checkbox,
  TextField,
  FormControlLabel,
  Divider,
  Stack,
} from '@mui/material';
import type { OrderItemRow } from '../../../types/order.types';

interface OrderTotalsProps {
  items: OrderItemRow[];
  applyTax: boolean;
  taxRate: number;
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
  onApplyTaxChange,
  onTaxRateChange,
  disabled = false,
}) => {
  // Calcular subtotal
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  // Calcular IVA
  const tax = applyTax ? subtotal * (taxRate / 100) : 0;

  // Calcular total
  const total = subtotal + tax;

  return (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={3}>
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
              label="Aplicar IVA"
            />

            {applyTax && (
              <Box sx={{ mt: 2, ml: 4 }}>
                <TextField
                  type="number"
                  label="Porcentaje de IVA"
                  value={taxRate}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 100) {
                      onTaxRateChange(value);
                    }
                  }}
                  disabled={disabled}
                  InputProps={{
                    endAdornment: <Typography>%</Typography>,
                  }}
                  sx={{ width: 150 }}
                  inputProps={{
                    min: 0,
                    max: 100,
                    step: 0.5,
                  }}
                />
              </Box>
            )}
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
