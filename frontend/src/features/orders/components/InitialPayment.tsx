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
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type {
  InitialPaymentData,
  PaymentMethod,
} from '../../../types/order.types';
import { PAYMENT_METHOD_LABELS } from '../../../types/order.types';
import { useAuthStore } from '../../../store/authStore';

const MAX_PAYMENTS = 3;

interface InitialPaymentProps {
  total: number;
  enabled: boolean;
  values: InitialPaymentData[];
  onEnabledChange: (value: boolean) => void;
  onChange: (data: InitialPaymentData[]) => void;
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

const formatCurrencyInput = (value: string | number): string => {
  const numericValue = value.toString().replace(/\D/g, '');
  if (!numericValue) return '';
  const number = parseInt(numericValue, 10);
  return new Intl.NumberFormat('es-CO').format(number);
};

const EMPTY_PAYMENT = (): InitialPaymentData => ({
  amount: 0,
  paymentMethod: 'TRANSFER',
  reference: '',
  notes: '',
  receiptFile: null,
});

export const InitialPayment: React.FC<InitialPaymentProps> = ({
  total,
  enabled,
  values = [],
  onChange,
  disabled = false,
  required = false,
}) => {
  // One ref per possible payment block (max 3)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  const handleFieldChange = (
    index: number,
    field: keyof InitialPaymentData,
    newValue: any,
  ) => {
    const updated = values.map((p, i) => {
      if (i !== index) return p;
      const updatedPayment = { ...p, [field]: newValue };
      if (field === 'paymentMethod' && newValue === 'CREDIT') {
        updatedPayment.amount = p.amount || 0;
      }
      return updatedPayment;
    });
    onChange(updated);
  };

  const handleAddPayment = () => {
    if (values.length >= MAX_PAYMENTS || disabled) return;
    onChange([...values, EMPTY_PAYMENT()]);
  };

  const handleRemovePayment = (index: number) => {
    if (values.length <= 1) return;
    onChange(values.filter((_, i) => i !== index));
  };

  // Computed values
  const totalPaid = values.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balance = total - totalPaid;
  const cashUsedIndices = values
    .map((p, i) => (p.paymentMethod === 'CASH' ? i : -1))
    .filter((i) => i !== -1);
  const cashAlreadyUsed = cashUsedIndices.length > 0;

  const isMethodDisabled = (index: number, method: PaymentMethod): boolean => {
    if (method !== 'CASH') return false;
    // CASH is disabled if another block already uses it
    return cashAlreadyUsed && !cashUsedIndices.includes(index);
  };

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
          <Stack spacing={2}>
            {values.map((payment, index) => (
              <Box
                key={index}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 2,
                  position: 'relative',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(0,0,0,0.01)',
                }}
              >
                {/* Block header */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                    Anticipo {index + 1}
                  </Typography>
                  {values.length > 1 && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemovePayment(index)}
                      disabled={disabled}
                      title="Eliminar anticipo"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                <Grid container spacing={2}>
                  {/* Método de Pago */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Método de Pago"
                      value={payment.paymentMethod || 'CASH'}
                      onChange={(e) =>
                        handleFieldChange(index, 'paymentMethod', e.target.value as PaymentMethod)
                      }
                      disabled={disabled}
                    >
                      {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(
                        ([method, label]) => (
                          <MenuItem
                            key={method}
                            value={method}
                            disabled={isMethodDisabled(index, method)}
                          >
                            {label}
                            {isMethodDisabled(index, method) ? ' (ya usado)' : ''}
                          </MenuItem>
                        ),
                      )}
                    </TextField>
                  </Grid>

                  {/* Monto */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      label="Monto del Abono"
                      value={
                        (payment.amount === 0 && payment.paymentMethod !== 'CREDIT')
                          ? ''
                          : payment.amount !== undefined && payment.amount !== null
                          ? formatCurrencyInput(payment.amount)
                          : ''
                      }
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        const amount = rawValue ? parseInt(rawValue, 10) : 0;
                        handleFieldChange(index, 'amount', amount);
                      }}
                      error={totalPaid > total}
                      helperText={
                        totalPaid > total
                          ? `La suma supera el total (${formatCurrency(total)})`
                          : disabled
                          ? 'Primero seleccione un cliente'
                          : `Máximo disponible: ${formatCurrency(total)}`
                      }
                      disabled={disabled}
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1, color: 'text.secondary', fontWeight: 500 }}>
                            $
                          </Typography>
                        ),
                      }}
                      inputProps={{
                        style: { textAlign: 'right', fontWeight: 600 },
                      }}
                    />
                  </Grid>

                  {/* Notas */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Notas del Pago"
                      placeholder="Ej: Anticipo"
                      value={payment.notes || ''}
                      onChange={(e) => handleFieldChange(index, 'notes', e.target.value)}
                      disabled={disabled}
                    />
                  </Grid>

                  {/* Comprobante */}
                  <Grid item xs={12}>
                    <Box>
                      <FormLabel sx={{ mb: 1, display: 'block' }}>
                        Comprobante de Pago (Opcional)
                      </FormLabel>
                      <input
                        type="file"
                        hidden
                        accept="image/jpeg,image/png,image/gif,image/webp,.pdf"
                        ref={(el) => { fileInputRefs.current[index] = el; }}
                        disabled={disabled}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFieldChange(index, 'receiptFile', file);
                          if (e.target) e.target.value = '';
                        }}
                      />

                      {!payment.receiptFile ? (
                        <Stack spacing={1}>
                          <Button
                            variant="outlined"
                            startIcon={<AttachFileIcon />}
                            size="small"
                            disabled={disabled}
                            onClick={() => fileInputRefs.current[index]?.click()}
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
                                  if (file) handleFieldChange(index, 'receiptFile', file);
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
                              '&:hover, &:focus': !disabled
                                ? { borderColor: 'primary.main', bgcolor: 'action.hover' }
                                : {},
                            }}
                            onClick={() => {
                              if (!disabled) fileInputRefs.current[index]?.click();
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
                          {payment.receiptFile.type.startsWith('image/') ? (
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
                                src={URL.createObjectURL(payment.receiptFile)}
                                alt="Vista previa"
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </Box>
                          ) : (
                            <Chip
                              icon={<AttachFileIcon />}
                              label={payment.receiptFile.name}
                              variant="outlined"
                            />
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleFieldChange(index, 'receiptFile', null)}
                            disabled={disabled}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Stack>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            ))}

            {/* Botón agregar anticipo */}
            {values.length < MAX_PAYMENTS && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddPayment}
                disabled={disabled}
                size="verySmall"
                sx={{ alignSelf: 'flex-end', textTransform: 'none' }}
              >
                Agregar otro anticipo
              </Button>
            )}

            {/* Resumen de totales */}
            <Box
              sx={{
                mt: 1,
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.02)',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Total abonado
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    {formatCurrency(totalPaid)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Saldo Pendiente
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: balance > 0 ? 'warning.main' : 'success.main',
                    }}
                  >
                    {formatCurrency(Math.max(0, balance))}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
};
