import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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

const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CO').format(parseInt(digits, 10));
};
import { DatePicker } from '@mui/x-date-pickers';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AccountPayable, RegisterPaymentDto } from '../../../types/accounts-payable.types';
import { PaymentMethod, PAYMENT_METHOD_LABELS } from '../../../types/expense-order.types';
import { formatCurrency } from '../../../utils/formatters';
import { storageApi } from '../../../api/storage.api';

const schema = z.object({
  amount: z.string().min(1, 'Ingresa el monto del pago'),
  paymentMethod: z.nativeEnum(PaymentMethod, { required_error: 'Selecciona el método de pago' }),
  paymentDate: z.date({ required_error: 'Selecciona la fecha de pago' }),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RegisterPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: RegisterPaymentDto) => void;
  loading?: boolean;
  accountPayable: AccountPayable;
}

export const RegisterPaymentDialog: React.FC<RegisterPaymentDialogProps> = ({
  open,
  onClose,
  onSubmit,
  loading,
  accountPayable,
}) => {
  const balance = Number(accountPayable.balance);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      paymentMethod: PaymentMethod.CASH,
      paymentDate: new Date(),
    },
  });

  const watchedAmount = watch('amount');
  const watchedAmountNum = watchedAmount ? Number(watchedAmount.replace(/\D/g, '')) : 0;
  const afterBalance = balance - watchedAmountNum;

  const handleClose = () => {
    reset();
    setReceiptFile(null);
    onClose();
  };

  const handleFileChange = (file: File | null) => {
    setReceiptFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (item) {
      const file = item.getAsFile();
      if (file) setReceiptFile(file);
    }
  }, []);

  const handleFormSubmit = async (values: FormValues) => {
    let receiptFileId: string | undefined;

    if (receiptFile) {
      setUploadingReceipt(true);
      try {
        const uploaded = await storageApi.uploadFile(receiptFile, {
          entityType: 'account_payable',
          entityId: accountPayable.id,
        });
        receiptFileId = uploaded.id;
      } finally {
        setUploadingReceipt(false);
      }
    }

    onSubmit({
      amount: Number(values.amount.replace(/\D/g, '')),
      paymentMethod: values.paymentMethod,
      paymentDate: values.paymentDate.toISOString(),
      reference: values.reference || undefined,
      notes: values.notes || undefined,
      receiptFileId,
    });
  };

  const isImage = receiptFile?.type.startsWith('image/');

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar Pago</DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {/* Resumen de la cuenta */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(accountPayable.totalAmount)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Abonado
              </Typography>
              <Typography variant="body2" fontWeight={600} color="success.main">
                {formatCurrency(accountPayable.paidAmount)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Saldo
              </Typography>
              <Typography variant="body2" fontWeight={600} color="warning.main">
                {formatCurrency(accountPayable.balance)}
              </Typography>
            </Box>
          </Box>

          {/* Monto */}
          <Controller
            name="amount"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <TextField
                {...field}
                label="Monto del pago *"
                value={value ? formatCurrencyInput(value) : ''}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                inputProps={{ style: { textAlign: 'right' } }}
                error={!!errors.amount}
                helperText={errors.amount?.message}
                fullWidth
              />
            )}
          />

          {/* Advertencia si supera el saldo */}
          {watchedAmountNum > 0 && watchedAmountNum > balance && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              El monto supera el saldo pendiente ({formatCurrency(balance)})
            </Alert>
          )}

          {/* Saldo después del pago */}
          {watchedAmountNum > 0 && watchedAmountNum <= balance && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: afterBalance <= 0 ? 'success.main' : 'info.main',
                color: 'white',
              }}
            >
              <Typography variant="body2" fontWeight={500}>
                {afterBalance <= 0
                  ? '✓ Con este pago la cuenta quedará completamente pagada'
                  : `Saldo restante después del pago: ${formatCurrency(afterBalance)}`}
              </Typography>
            </Box>
          )}

          {/* Método de pago */}
          <Controller
            name="paymentMethod"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.paymentMethod}>
                <InputLabel>Método de pago *</InputLabel>
                <Select {...field} label="Método de pago *">
                  {Object.values(PaymentMethod).map((method) => (
                    <MenuItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </MenuItem>
                  ))}
                </Select>
                {errors.paymentMethod && (
                  <FormHelperText>{errors.paymentMethod.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />

          {/* Fecha de pago */}
          <Controller
            name="paymentDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Fecha de pago *"
                value={field.value}
                onChange={field.onChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.paymentDate,
                    helperText: errors.paymentDate?.message,
                  },
                }}
              />
            )}
          />

          {/* Referencia */}
          <Controller
            name="reference"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Referencia / Comprobante"
                placeholder="Número de transferencia, cheque, etc."
                fullWidth
              />
            )}
          />

          {/* Comprobante de pago (archivo) */}
          <Box>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              Comprobante de pago
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              hidden
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {!receiptFile ? (
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<AttachFileIcon />}
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                >
                  Adjuntar imagen o PDF
                </Button>
                <Box
                  onPaste={handlePaste}
                  tabIndex={0}
                  sx={{
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                    '&:hover, &:focus': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <ImageIcon sx={{ fontSize: 28, color: 'grey.400', mb: 0.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    O pega una imagen aquí (Ctrl+V / ⌘+V)
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Stack spacing={1}>
                {isImage && (
                  <Box
                    sx={{
                      width: 'fit-content',
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'grey.50',
                    }}
                  >
                    <Box
                      component="img"
                      src={URL.createObjectURL(receiptFile)}
                      alt="Vista previa comprobante"
                      sx={{ display: 'block', maxWidth: 200, maxHeight: 140, objectFit: 'contain' }}
                      onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                    />
                  </Box>
                )}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Chip
                    icon={<ImageIcon />}
                    label={`${receiptFile.name} (${(receiptFile.size / 1024).toFixed(1)} KB)`}
                    color="primary"
                    variant="outlined"
                    size="small"
                    onDelete={() => handleFileChange(null)}
                    deleteIcon={<CloseIcon />}
                  />
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<AttachFileIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ textTransform: 'none' }}
                  >
                    Cambiar
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>

          {/* Notas */}
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Notas adicionales"
                multiline
                rows={2}
                fullWidth
              />
            )}
          />
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={loading || uploadingReceipt}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(handleFormSubmit)}
          disabled={loading || uploadingReceipt || (watchedAmountNum > 0 && watchedAmountNum > balance)}
          startIcon={(loading || uploadingReceipt) ? <CircularProgress size={16} /> : null}
        >
          {uploadingReceipt ? 'Subiendo comprobante...' : 'Registrar Pago'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
