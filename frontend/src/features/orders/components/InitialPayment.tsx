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
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const InitialPayment: React.FC<InitialPaymentProps> = ({
  total,
  enabled,
  value,
  onEnabledChange,
  onChange,
  errors = {},
}) => {
  const handleFieldChange = (field: keyof InitialPaymentData, newValue: any) => {
    onChange({
      amount: value?.amount || 0,
      paymentMethod: value?.paymentMethod || 'CASH',
      reference: value?.reference,
      notes: value?.notes,
      [field]: newValue,
    });
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
            />
          }
          label={
            <Typography variant="subtitle1" fontWeight={500}>
              Registrar abono inicial
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
                  type="number"
                  label="Monto del Abono"
                  value={value?.amount || ''}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    handleFieldChange('amount', amount);
                  }}
                  error={!!errors['payment.amount']}
                  helperText={
                    errors['payment.amount'] ||
                    `Máximo: ${formatCurrency(total)}`
                  }
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                  inputProps={{
                    min: 0,
                    max: total,
                    step: 1000,
                  }}
                />
              </Grid>

              {/* Método de pago */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
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
