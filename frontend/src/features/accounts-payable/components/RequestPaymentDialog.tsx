import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import { DatePicker } from '@mui/x-date-pickers';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { storageApi } from '../../../api/storage.api';
import type { AccountPayable, CreateApPaymentAuthRequestDto } from '../../../types/accounts-payable.types';
import { BankSelector } from '../../../components/common/BankSelector';
import { formatCurrency } from '../../../utils/formatters';
import {
  formatCurrencyInput,
  parseCurrencyInput,
  sanitizeCurrencyInput,
  toCurrencyInputValue,
} from '../../../utils/currencyInput';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CREDIT: 'Crédito',
};

const schema = z.object({
  amount: z.string().min(1, 'El monto es requerido'),
  paymentMethod: z.string().min(1, 'Selecciona un método de pago'),
  paymentDate: z.date({ required_error: 'La fecha es requerida' }).nullable(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  bankEntity: z.string().nullable().optional(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  accountPayable: AccountPayable;
  onSubmit: (dto: CreateApPaymentAuthRequestDto) => Promise<void>;
  loading: boolean;
}

export const RequestPaymentDialog: React.FC<Props> = ({
  open,
  onClose,
  accountPayable,
  onSubmit,
  loading,
}) => {
  // Dos comprobantes opcionales: el soporte suele venir partido (la
  // transferencia por un lado, la factura o el recibo sellado por otro).
  const [receiptFiles, setReceiptFiles] = useState<(File | null)[]>([null, null]);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const balance = Number(accountPayable.balance);
  // El input solo acepta enteros; el máximo pagable es el floor del saldo real
  const maxPayable = Math.floor(balance);
  const hasBalanceCents = balance % 1 !== 0;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      paymentMethod: 'CASH',
      paymentDate: new Date(),
      reference: '',
      notes: '',
      bankEntity: null,
      reason: '',
    },
  });

  const watchedAmount = watch('amount');
  const watchedMethod = watch('paymentMethod');
  const watchedAmountNum = parseCurrencyInput(watchedAmount ?? '');
  const afterBalance = balance - watchedAmountNum;
  const exceedsBalance = watchedAmountNum > maxPayable;

  const handleClose = () => {
    if (!loading) {
      reset();
      setReceiptFiles([null, null]);
      onClose();
    }
  };

  const handleFileChange = (index: number, file: File | null) => {
    setReceiptFiles((prev) => prev.map((f, i) => (i === index ? file : f)));
    const input = fileInputRefs[index].current;
    if (input) input.value = '';
  };

  // Al pegar, la imagen cae en el primer espacio libre para no pisar lo ya adjunto.
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (item) {
      const file = item.getAsFile();
      if (file) {
        setReceiptFiles((prev) => {
          const slot = prev.findIndex((f) => !f);
          if (slot === -1) return prev;
          return prev.map((f, i) => (i === slot ? file : f));
        });
      }
    }
  }, []);

  const handleFormSubmit = async (values: FormValues) => {
    const uploadedIds: (string | undefined)[] = [undefined, undefined];

    if (receiptFiles.some(Boolean)) {
      setUploadingReceipt(true);
      try {
        for (let i = 0; i < receiptFiles.length; i++) {
          const file = receiptFiles[i];
          if (!file) continue;
          const uploaded = await storageApi.uploadFile(file, {
            entityType: 'account_payable',
            entityId: accountPayable.id,
          });
          uploadedIds[i] = uploaded.id;
        }
      } finally {
        setUploadingReceipt(false);
      }
    }

    // Si solo se adjuntó el segundo, se envía como primer comprobante para no
    // dejar huecos en el registro del pago.
    const [receiptFileId, receiptFileId2] = uploadedIds.filter(Boolean).length === 1
      ? [uploadedIds.find(Boolean), undefined]
      : uploadedIds;

    await onSubmit({
      accountPayableId: accountPayable.id,
      amount: parseCurrencyInput(values.amount),
      paymentMethod: values.paymentMethod,
      paymentDate: values.paymentDate!.toISOString(),
      reference: values.reference || undefined,
      notes: values.notes || undefined,
      bankEntity: values.paymentMethod === 'TRANSFER' ? values.bankEntity ?? null : null,
      receiptFileId,
      receiptFileId2,
      reason: values.reason || undefined,
    });
  };

  const isBusy = loading || uploadingReceipt;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth onPaste={handlePaste}>
      <DialogTitle>Solicitar Pago de CP</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Flujo de doble autorización</AlertTitle>
          Tu solicitud será enviada al <strong>administrador</strong> para su aprobación (paso 1).
          Luego, <strong>Caja</strong> registrará el pago (paso 2). Recibirás notificaciones en
          cada paso. También se enviará una alerta por <strong>WhatsApp</strong>.
        </Alert>

        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>CP:</strong> {accountPayable.apNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Saldo:</strong>{' '}
              {balance.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Box>

          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <Box>
                <TextField
                  {...field}
                  value={formatCurrencyInput(field.value ?? '')}
                  label="Monto del pago"
                  fullWidth
                  required
                  error={!!errors.amount || exceedsBalance}
                  helperText={
                    errors.amount?.message ||
                    (exceedsBalance
                      ? `El monto supera el saldo. El máximo a ingresar es ${maxPayable.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}${
                          hasBalanceCents ? ` (el saldo incluye centavos: ${balance.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 })})` : ''
                        }`
                      : watchedAmountNum > 0
                        ? `Saldo restante: ${Math.max(0, afterBalance).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : undefined)
                  }
                  FormHelperTextProps={exceedsBalance ? { sx: { color: 'error.main', fontWeight: 600 } } : undefined}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  onChange={(e) => field.onChange(sanitizeCurrencyInput(e.target.value))}
                />
                {/* Atajo: pagar el saldo total */}
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={`Pagar total: ${formatCurrency(maxPayable)}`}
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={() => field.onChange(toCurrencyInputValue(maxPayable))}
                    sx={{ cursor: 'pointer', fontSize: '0.72rem' }}
                  />
                </Box>
              </Box>
            )}
          />

          <Controller
            name="paymentMethod"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth required error={!!errors.paymentMethod}>
                <InputLabel>Método de pago</InputLabel>
                <Select {...field} label="Método de pago">
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
                {errors.paymentMethod && (
                  <FormHelperText>{errors.paymentMethod.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />

          {watchedMethod === 'TRANSFER' && (
            <Controller
              name="bankEntity"
              control={control}
              render={({ field }) => (
                <BankSelector value={field.value ?? null} onChange={field.onChange} />
              )}
            />
          )}

          <Controller
            name="paymentDate"
            control={control}
            render={({ field, fieldState }) => (
              <DatePicker
                label="Fecha del pago"
                value={field.value}
                onChange={field.onChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!fieldState.error,
                    helperText: fieldState.error?.message,
                  },
                }}
              />
            )}
          />

          {/* Comprobantes (ambos opcionales) */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Comprobantes (opcionales)
            </Typography>
            <Stack spacing={1.5}>
              {receiptFiles.map((file, index) => (
                <Box key={index}>
                  <input
                    type="file"
                    ref={fileInputRefs[index]}
                    style={{ display: 'none' }}
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(index, e.target.files?.[0] ?? null)}
                  />
                  <Button
                    startIcon={<AttachFileIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => fileInputRefs[index].current?.click()}
                  >
                    {file
                      ? `Cambiar comprobante ${index + 1}`
                      : `Adjuntar comprobante ${index + 1}`}
                  </Button>
                  {file && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      {file.type.startsWith('image/') ? (
                        <ImageIcon fontSize="small" color="primary" />
                      ) : (
                        <AttachFileIcon fontSize="small" color="primary" />
                      )}
                      <Typography variant="caption">{file.name}</Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleFileChange(index, null)}
                        sx={{ minWidth: 0, p: 0.5 }}
                      >
                        <CloseIcon fontSize="small" />
                      </Button>
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              También puedes pegar una imagen con Ctrl+V
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isBusy}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(handleFormSubmit)}
          disabled={isBusy || exceedsBalance}
          startIcon={isBusy ? <CircularProgress size={16} /> : undefined}
        >
          {uploadingReceipt ? 'Subiendo comprobantes...' : 'Enviar solicitud'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
