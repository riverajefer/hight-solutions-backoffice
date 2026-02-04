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
  Collapse,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  Divider,
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
  onEnabledChange,
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
        <Box display="flex" alignItems="center" mb={required ? 2 : 0}>
          {!required ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabled}
                  onChange={(e) => {
                    onEnabledChange(e.target.checked);
                    if (!e.target.checked) {
                      onChange(null);
                    }
                  }}
                  disabled={disabled}
                />
              }
              label={
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                  Registrar abono inicial
                </Typography>
              }
            />
          ) : (
            <>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
                4. Abono Inicial (Obligatorio)
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </>
          )}
        </Box>

        <Collapse in={enabled || required}>
          <Grid container spacing={2}>
            {/* Fila 1: Monto y Método de Pago */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label="Monto del Abono"
                size="medium"
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
                error={!!errors['payment.amount']}
                helperText={
                  errors['payment.amount'] ||
                  (disabled ? 'Primero seleccione un cliente' : `Máximo: ${formatCurrency(total)}`)
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

            <Grid item xs={12} md={8}>
              <FormControl component="fieldset" fullWidth disabled={disabled}>
                <FormLabel component="legend" sx={{ fontSize: '0.75rem', mb: 0.5 }}>Método de Pago</FormLabel>
                <RadioGroup
                  row
                  value={value?.paymentMethod || 'CASH'}
                  onChange={(e) =>
                    handleFieldChange(
                      'paymentMethod',
                      e.target.value as PaymentMethod
                    )
                  }
                  sx={{ gap: 1 }}
                >
                  {(
                    Object.entries(PAYMENT_METHOD_LABELS) as [
                      PaymentMethod,
                      string
                    ][]
                  ).map(([method, label]) => (
                    <FormControlLabel
                      key={method}
                      value={method}
                      control={<Radio size="small" />}
                      label={<Typography variant="body2">{label}</Typography>}
                      sx={{ mr: 1 }}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* Fila 2: Referencia y Notas */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="medium"
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
                size="medium"
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
                  mt: 1,
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid #4b4545ff',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'transparent' : 'rgba(0,0,0,0.02)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                  
                </Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ 
                    fontSize: '1.1rem',
                    display: 'inline-block', color: 'text.secondary' }}>
                    Saldo Pendiente
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      display: 'inline-block',
                      marginLeft: '10px',
                      fontSize: '1.7rem',
                      fontWeight: 700,
                      color: balance > 0 ? 'warning.main' : 'success.main',
                      lineHeight: 1.2
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
