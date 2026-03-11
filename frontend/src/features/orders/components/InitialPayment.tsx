import React, { useRef } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Collapse,
  Divider,
  MenuItem,
  FormLabel,
  Stack,
  Button,
  IconButton,
  Chip,
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import type {
  InitialPaymentData,
  PaymentMethod,
} from '../../../types/order.types';
import { PAYMENT_METHOD_LABELS } from '../../../types/order.types';
import { useAuthStore } from '../../../store/authStore';

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
  const receiptFileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof InitialPaymentData, newValue: any) => {
    const updatedData: InitialPaymentData = {
      amount: value?.amount ?? 0,
      paymentMethod: value?.paymentMethod || 'CASH',
      reference: value?.reference,
      notes: value?.notes,
      receiptFile: value?.receiptFile,
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

        {/* Alerta: anticipo requiere aprobación de Caja */}
        {enabled && !useAuthStore.getState().permissions.includes('approve_advance_payments') && (
          <Alert severity="info" sx={{ mb: 2 }}>
            El anticipo debe ser aprobado por Caja antes de que la orden pueda avanzar de estado.
          </Alert>
        )}

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

            {/* Fila 2: Notas */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas del Pago"
                placeholder="Ej: Anticipo"
                value={value?.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            {/* Fila 3: Comprobante */}
            <Grid item xs={12}>
              <Box>
                <FormLabel sx={{ mb: 1, display: 'block' }}>
                  Comprobante de Pago (Opcional)
                </FormLabel>
                <input
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/gif,image/webp,.pdf"
                  ref={receiptFileInputRef}
                  disabled={disabled}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFieldChange('receiptFile', file);
                    if (e.target) e.target.value = '';
                  }}
                />

                {!value?.receiptFile ? (
                  <Stack spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<AttachFileIcon />}
                      size="small"
                      disabled={disabled}
                      onClick={() => receiptFileInputRef.current?.click()}
                      sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                    >
                      Adjuntar imagen o PDF
                    </Button>
                    <Box
                      onPaste={(e) => {
                        if (disabled) return;
                        const items = e.clipboardData.items;
                        for (let i = 0; i < items.length; i++) {
                          if (items[i].type.indexOf('image') !== -1) {
                            const file = items[i].getAsFile();
                            if (file) handleFieldChange('receiptFile', file);
                            break;
                          }
                        }
                      }}
                      tabIndex={disabled ? -1 : 0}
                      sx={{
                        border: '2px dashed',
                        borderColor: 'grey.300',
                        borderRadius: 1,
                        p: 2,
                        textAlign: 'center',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.6 : 1,
                        transition: 'border-color 0.2s, background-color 0.2s',
                        '&:hover, &:focus': !disabled ? {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                        } : {},
                      }}
                      onClick={() => {
                        if (!disabled) receiptFileInputRef.current?.click();
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 28, color: 'grey.400', mb: 0.5 }} />
                      <Typography variant="caption" color="text.secondary" display="block">
                        O pega una imagen aquí (Ctrl+V / ⌘+V)
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Stack spacing={1.5} direction="row" alignItems="center">
                    {value.receiptFile.type.startsWith('image/') ? (
                      <Box
                        sx={{
                          position: 'relative',
                          width: 80,
                          height: 80,
                          border: '1px solid',
                          borderColor: 'grey.300',
                          borderRadius: 1,
                          overflow: 'hidden',
                          bgcolor: 'grey.50',
                        }}
                      >
                        <Box
                          component="img"
                          src={URL.createObjectURL(value.receiptFile)}
                          alt="Vista previa"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </Box>
                    ) : (
                      <Chip
                        icon={<AttachFileIcon />}
                        label={value.receiptFile.name}
                        variant="outlined"
                      />
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleFieldChange('receiptFile', null)}
                      disabled={disabled}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Stack>
                )}
              </Box>
            </Grid>

            {/* Fila 4: Saldo Calculado */}
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
