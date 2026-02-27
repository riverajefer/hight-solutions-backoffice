import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Collapse,
  Divider,
  MenuItem,
} from '@mui/material';
import type {
  InitialPaymentData,
  PaymentMethod,
} from '../../../types/order.types';
import { PAYMENT_METHOD_LABELS } from '../../../types/order.types';

interface InitialPaymentProps {
  total: number;
  enabled: boolean;
  value: InitialPaymentData | null;
  onEnabledChange: (value: boolean) => void;
  onChange: (data: InitialPaymentData | null) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  required?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Formatear moneda mientras se escribe (con separadores de miles)
const formatCurrencyInput = (value: string | number): string => {
  // Convertir a string y remover todo excepto números
  const numericValue = value.toString().replace(/\D/g, '');

  if (!numericValue) return '';

  // Convertir a número y formatear con separadores de miles
  const number = parseInt(numericValue, 10);
  return new Intl.NumberFormat('es-CO').format(number);
};

export const InitialPayment: React.FC<InitialPaymentProps> = ({
  total,
  enabled,
  value,
  onChange,
  errors = {},
  disabled = false,
  required = false,
}) => {
  const handleFieldChange = (field: keyof InitialPaymentData, newValue: any) => {
    const updatedData: InitialPaymentData = {
      amount: value?.amount ?? 0,
      paymentMethod: value?.paymentMethod || 'CASH',
      reference: value?.reference,
      notes: value?.notes,
      [field]: newValue,
    };

    if (field === 'paymentMethod' && newValue === 'CREDIT') {
      updatedData.amount = value?.amount || 0;
    }

    onChange(updatedData);
  };

  const balance = total - (value?.amount || 0);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
          Abono Inicial
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Collapse in={enabled || required}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Fila 1: Método de Pago y Monto */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Método de Pago"
                value={value?.paymentMethod || 'CASH'}
                onChange={(e) =>
                  handleFieldChange(
                    'paymentMethod',
                    e.target.value as PaymentMethod
                  )
                }
                disabled={disabled}
              >
                {(
                  Object.entries(PAYMENT_METHOD_LABELS) as [
                    PaymentMethod,
                    string
                  ][]
                ).map(([method, label]) => (
                  <MenuItem key={method} value={method}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Monto del Abono"
                value={
                  value?.amount === 0 && (value?.paymentMethod || 'CASH') !== 'CREDIT'
                    ? ''
                    : value?.amount !== undefined && value?.amount !== null
                      ? formatCurrencyInput(value.amount)
                      : ''
                }
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  const amount = rawValue ? parseInt(rawValue, 10) : 0;
                  handleFieldChange('amount', amount);
                }}
                error={!!errors['payment.amount'] || (value?.amount || 0) > total}
                helperText={
                  !!errors['payment.amount'] 
                    ? errors['payment.amount']
                    : (value?.amount || 0) > total
                      ? `El abono no puede superar el total (${formatCurrency(total)})`
                      : disabled 
                        ? 'Primero seleccione un cliente' 
                        : `Máximo: ${formatCurrency(total)}`
                }
                disabled={disabled}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary', fontWeight: 500 }}>$</Typography>,
                }}
                inputProps={{
                  style: { textAlign: 'right', fontWeight: 600 },
                }}
              />
            </Grid>

            {/* Fila 2: Referencia y Notas */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Referencia"
                placeholder="Ej: REF-12345"
                value={value?.reference || ''}
                onChange={(e) => handleFieldChange('reference', e.target.value)}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Notas del Pago"
                placeholder="Ej: Anticipo"
                value={value?.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            {/* Fila 3: Saldo Calculado */}
            <Grid item xs={12}>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  El saldo pendiente se calculará automáticamente restando el abono del total.
                </Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{
                    fontSize: '0.9rem',
                    color: 'text.secondary',
                    display: 'block',
                    mb: 0.5
                  }}>
                    Saldo Pendiente
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: balance > 0 ? 'warning.main' : 'success.main',
                    }}
                  >
                    {formatCurrency(balance)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Collapse>
      </CardContent>
    </Card>
  );
};
