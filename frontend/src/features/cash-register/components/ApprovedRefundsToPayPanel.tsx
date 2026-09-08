import React, { useCallback, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import {
  usePendingExecutionRefundRequests,
  useExecuteRefundRequest,
} from '../../orders/hooks/useRefundRequests';
import type { RefundRequest } from '../../../types/refund-request.types';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { storageApi } from '../../../api/storage.api';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
};

const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <LocalAtmIcon fontSize='inherit' />,
  TRANSFER: <SyncAltIcon fontSize='inherit' />,
  CARD: <CreditCardIcon fontSize='inherit' />,
};

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(value));

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('es-CO', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/**
 * Devoluciones que gerencia ya autorizó y esperan que Caja las pague.
 *
 * Es la segunda mitad del flujo: autorizar y pagar son actos distintos, hechos
 * por personas distintas y en momentos distintos. Hasta que el botón de esta
 * tarjeta se presione, el dinero sigue en la caja y la OP conserva su estado.
 */
const ApprovedRefundsToPayPanel: React.FC<{ hideWhenEmpty?: boolean }> = ({
  hideWhenEmpty,
}) => {
  const {
    data: requests = [],
    isLoading,
    isFetching,
    refetch,
  } = usePendingExecutionRefundRequests();
  const executeMutation = useExecuteRefundRequest();

  const [payTarget, setPayTarget] = useState<RefundRequest | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();

  // El comprobante solo aplica a transferencias: una devolución en efectivo
  // queda soportada por el recibo de caja que genera esta misma ejecución.
  const needsReceipt = payTarget?.paymentMethod === 'TRANSFER';
  const receiptIsImage = receiptFile?.type.startsWith('image/') ?? false;

  const closePayDialog = () => {
    setPayTarget(null);
    setReceiptFile(null);
  };

  const handleFileChange = (file: File | null) => {
    setReceiptFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Pegar el pantallazo del banco es más rápido que buscarlo en el disco.
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith('image/'),
    );
    if (item) {
      const file = item.getAsFile();
      if (file) setReceiptFile(file);
    }
  }, []);

  // `disabled={isPending}` no alcanza: el botón solo se deshabilita cuando React
  // vuelve a renderizar, y dos clics en el mismo frame entran los dos. Pagar dos
  // veces saca el dinero dos veces.
  const handleConfirmPay = useSingleFlight(async () => {
    if (!payTarget) return;

    // El archivo se sube antes de mover el dinero: si la subida falla, todavía
    // se puede reintentar sin que el egreso ya esté hecho.
    let receiptFileId: string | undefined;
    if (needsReceipt && receiptFile) {
      setUploadingReceipt(true);
      try {
        const uploaded = await storageApi.uploadFile(receiptFile, {
          entityType: 'refund_request',
          entityId: payTarget.orderId,
        });
        receiptFileId = uploaded.id;
      } catch {
        enqueueSnackbar(
          'No se pudo subir el comprobante. La devolución no se pagó.',
          { variant: 'error' },
        );
        return;
      } finally {
        setUploadingReceipt(false);
      }
    }

    await executeMutation.mutateAsync({ id: payTarget.id, dto: { receiptFileId } });
    closePayDialog();
  });

  if (isLoading) return null;
  if (hideWhenEmpty && requests.length === 0) return null;

  return (
    <>
      <Card
        sx={{
          mb: 2,
          border: requests.length > 0 ? '1px solid' : undefined,
          borderColor: 'warning.main',
        }}
      >
        <CardContent
          sx={{ pb: requests.length === 0 ? '16px !important' : undefined }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: requests.length > 0 ? 1.5 : 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CurrencyExchangeIcon color='warning' fontSize='small' />
              <Typography variant='subtitle2' color='text.secondary'>
                Devoluciones Autorizadas Pendientes de Pago
              </Typography>
              {requests.length > 0 && (
                <Badge
                  badgeContent={requests.length}
                  color='warning'
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            <Tooltip title='Actualizar' arrow>
              <IconButton
                size='small'
                onClick={() => refetch()}
                disabled={isFetching}
                sx={{ color: 'text.secondary' }}
              >
                <RefreshIcon
                  fontSize='small'
                  sx={{
                    animation: isFetching ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>

          {requests.length === 0 && (
            <Typography
              variant='subtitle2'
              color='text.disabled'
              sx={{ mt: 0.2 }}
            >
              No hay devoluciones pendientes de pago
            </Typography>
          )}

          {requests.length > 0 && <Divider sx={{ mb: 1.5 }} />}

          <Stack spacing={1.5}>
            {requests.map((req) => {
              const clientName = req.order?.client?.name || '—';
              const reviewerName =
                [req.reviewedBy?.firstName, req.reviewedBy?.lastName]
                  .filter(Boolean)
                  .join(' ') ||
                req.reviewedBy?.email ||
                '—';
              const reverses = Number(req.reversedAmount ?? 0) > 0;

              return (
                <Box
                  key={req.id}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Chip
                          label={req.order?.orderNumber || '—'}
                          size='small'
                          color='primary'
                          variant='outlined'
                          sx={{ fontWeight: 600 }}
                        />
                        <Typography variant='body2' fontWeight={500} noWrap>
                          {clientName}
                        </Typography>
                        {reverses && (
                          <Chip
                            label='Anula venta'
                            size='small'
                            color='error'
                            variant='outlined'
                            sx={{ fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mb: 0.5,
                        }}
                      >
                        <PersonIcon
                          sx={{ fontSize: 14, color: 'text.disabled' }}
                        />
                        <Typography variant='caption' color='text.secondary'>
                          Autorizado por: {reviewerName} ·{' '}
                          {formatDate(req.reviewedAt)}
                        </Typography>
                      </Box>

                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Chip
                          icon={
                            <>{PAYMENT_METHOD_ICONS[req.paymentMethod] || null}</>
                          }
                          label={
                            PAYMENT_METHOD_LABELS[req.paymentMethod] ||
                            req.paymentMethod
                          }
                          size='small'
                          variant='outlined'
                          sx={{ fontSize: '0.7rem' }}
                        />
                        <Typography
                          variant='body2'
                          fontWeight={700}
                          color='warning.main'
                        >
                          {formatCurrency(req.refundAmount)}
                        </Typography>
                      </Box>

                      {req.observation && (
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{ mt: 0.5, display: 'block' }}
                        >
                          Motivo: {req.observation}
                        </Typography>
                      )}
                    </Box>

                    <Button
                      variant='contained'
                      color='warning'
                      size='small'
                      startIcon={<PaymentsIcon />}
                      onClick={() => setPayTarget(req)}
                      sx={{ minWidth: 120, fontSize: '0.75rem', flexShrink: 0 }}
                    >
                      Pagar
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={!!payTarget}
        onClose={closePayDialog}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>Pagar devolución</DialogTitle>
        <DialogContent>
          <DialogContentText component='div'>
            Vas a registrar un egreso de{' '}
            <strong>
              {payTarget ? formatCurrency(payTarget.refundAmount) : ''}
            </strong>{' '}
            de la orden <strong>{payTarget?.order?.orderNumber}</strong>.
            {Number(payTarget?.reversedAmount ?? 0) > 0 && (
              <Box sx={{ mt: 1 }}>
                Además se anularán{' '}
                <strong>
                  {formatCurrency(payTarget?.reversedAmount ?? 0)}
                </strong>{' '}
                de la venta. Si con eso la orden queda sin valor, pasará a estado{' '}
                <strong>Devolución de dinero</strong>.
              </Box>
            )}
            <Box sx={{ mt: 1 }}>
              El dinero sale de la caja en este momento y la operación no se
              deshace.
            </Box>
          </DialogContentText>

          {needsReceipt && (
            <Box sx={{ mt: 2 }}>
              <Typography variant='body2' fontWeight={500} sx={{ mb: 1 }}>
                Comprobante de la transferencia{' '}
                <Typography
                  component='span'
                  variant='caption'
                  color='text.secondary'
                >
                  (opcional)
                </Typography>
              </Typography>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg,image/png,image/gif,image/webp,application/pdf'
                hidden
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              {!receiptFile ? (
                <Stack spacing={1}>
                  <Button
                    variant='outlined'
                    startIcon={<AttachFileIcon />}
                    size='small'
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
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      outline: 'none',
                      '&:hover, &:focus': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ImageIcon
                      sx={{ fontSize: 28, color: 'text.disabled', mb: 0.5 }}
                    />
                    <Typography variant='caption' color='text.secondary'>
                      O pega una imagen aquí (Ctrl+V / ⌘+V)
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={1}>
                  {receiptIsImage && (
                    <Box
                      sx={{
                        width: 'fit-content',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        component='img'
                        src={URL.createObjectURL(receiptFile)}
                        alt='Vista previa del comprobante'
                        sx={{
                          display: 'block',
                          maxWidth: 200,
                          maxHeight: 140,
                          objectFit: 'contain',
                        }}
                        onLoad={(e) =>
                          URL.revokeObjectURL((e.target as HTMLImageElement).src)
                        }
                      />
                    </Box>
                  )}
                  <Stack direction='row' alignItems='center' spacing={1}>
                    <Chip
                      icon={<ImageIcon />}
                      label={`${receiptFile.name} (${(receiptFile.size / 1024).toFixed(1)} KB)`}
                      color='primary'
                      variant='outlined'
                      size='small'
                      onDelete={() => handleFileChange(null)}
                      deleteIcon={<CloseIcon />}
                    />
                    <Button
                      size='small'
                      variant='text'
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
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closePayDialog}
            disabled={executeMutation.isPending || uploadingReceipt}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='warning'
            onClick={handleConfirmPay}
            disabled={executeMutation.isPending || uploadingReceipt}
          >
            {uploadingReceipt
              ? 'Subiendo comprobante...'
              : executeMutation.isPending
                ? 'Pagando...'
                : 'Confirmar pago'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ApprovedRefundsToPayPanel;
