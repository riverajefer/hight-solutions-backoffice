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

    // Al cambiar el método de pago a crédito, nos aseguramos de que se muestre "0" 
    // si el campo estaba "vacío" (monto 0). Si ya tenía un valor, se conserva.
    if (field === 'paymentMethod' && newValue === 'CREDIT') {
      updatedData.amount = value?.amount || 0;
    }

    onChange(updatedData);
  };

  const balance = total - (value?.amount || 0);

  return (
    <Card variant="outlined">
      <CardContent>
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
              disabled={required || disabled}
            />
          }
          label={
            <Typography variant="subtitle1" fontWeight={500}>
              {required ? 'Abono Inicial (Obligatorio)' : 'Registrar abono inicial'}
            </Typography>
          }
        />

        <Collapse in={enabled}>
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              {/* Monto del abono */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Monto del Abono"
                  value={
                    // Si el monto es 0 y el método no es crédito, lo mostramos vacío
                    // para cumplir con el requerimiento de "vacío por defecto".
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
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                  inputProps={{
                    style: { textAlign: 'right' },
                  }}
                />
              </Grid>

              {/* Método de pago */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={disabled}>
                  <FormLabel>Método de Pago</FormLabel>
                  <RadioGroup
                    value={value?.paymentMethod || 'CASH'}
                    onChange={(e) =>
                      handleFieldChange(
                        'paymentMethod',
                        e.target.value as PaymentMethod
                      )
                    }
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
                        label={label}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Grid>

              {/* Referencia */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Número de Referencia"
                  placeholder="Ej: REF-12345, Transf-001"
                  value={value?.reference || ''}
                  onChange={(e) => handleFieldChange('reference', e.target.value)}
                  disabled={disabled}
                  helperText="Opcional: Número de comprobante, transferencia, etc."
                />
              </Grid>

              {/* Notas */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Notas del Pago"
                  placeholder="Ej: Anticipo del 50%"
                  value={value?.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  disabled={disabled}
                  helperText="Opcional: Observaciones sobre el pago"
                />
              </Grid>

              {/* Saldo calculado */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mt: 2 }}
                >
                  <Typography variant="subtitle1" fontWeight={500}>
                    Saldo Pendiente:
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    color={balance > 0 ? 'warning.main' : 'success.main'}
                  >
                    {formatCurrency(balance)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};
