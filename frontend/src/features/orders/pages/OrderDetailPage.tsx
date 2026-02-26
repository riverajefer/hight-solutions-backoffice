import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Stack,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  FormLabel,
  Tabs,
  Tab,
  useTheme,
  Paper,
} from '@mui/material';

import {
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Discount as DiscountIcon,
  Receipt as ReceiptIcon,
  Build as BuildIcon,
  OpenInNew as OpenInNewIcon,
  Image as ImageIcon,
  AccountTree as AccountTreeIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useOrder, useOrderPayments } from '../hooks';
import {
  OrderStatusChip,
  OrderPdfButton,
  ApplyDiscountDialog,
  DiscountsSection,
  ToolbarButton,
} from '../components';
import { ActivePermissionBanner } from '../components/ActivePermissionBanner';
import { RequestEditPermissionButton } from '../components/RequestEditPermissionButton';
import { EditRequestsList } from '../components/EditRequestsList';
import { OrderChangeHistoryTab } from '../components/OrderChangeHistoryTab';
import { ordersApi } from '../../../api/orders.api';
import { storageApi } from '../../../api/storage.api';
import axiosInstance from '../../../api/axios';
import { useAuthStore } from '../../../store/authStore';
import { ROUTES } from '../../../utils/constants';
import type {
  OrderStatus,
  PaymentMethod,
  CreatePaymentDto,
  ApplyDiscountDto,
} from '../../../types/order.types';
import {
  ORDER_STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
} from '../../../types/order.types';

const formatCurrency = (value: string): string => {
  const numValue = parseFloat(value);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
};

const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

const formatDateTime = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
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

export const OrderDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, permissions } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const { orderQuery, updateStatusMutation, deleteOrderMutation } = useOrder(
    id!
  );
  const { paymentsQuery, addPaymentMutation } = useOrderPayments(id!);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [paymentData, setPaymentData] = useState<CreatePaymentDto>({
    amount: 0,
    paymentMethod: 'CASH',
    paymentDate: new Date().toISOString(),
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const receiptFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [deletingReceipt, setDeletingReceipt] = useState<string | null>(null);

  const handleReceiptPaste = (e: React.ClipboardEvent) => {
    const clipItems = e.clipboardData?.items;
    if (!clipItems) return;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.indexOf('image') !== -1) {
        const file = clipItems[i].getAsFile();
        if (file) {
          const extension = file.type.split('/')[1] || 'png';
          const newFile = new File([file], `pasted-receipt-${Date.now()}.${extension}`, { type: file.type });
          setReceiptFile(newFile);
          e.preventDefault();
          break;
        }
      }
    }
  };
  const [deletingDiscount, setDeletingDiscount] = useState(false);
  const [viewReceiptDialog, setViewReceiptDialog] = useState<{
    open: boolean;
    url: string;
    mimeType: string;
  }>({ open: false, url: '', mimeType: '' });
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const order = orderQuery.data;
  const payments = paymentsQuery.data || [];
  const discounts = order?.discounts || [];

  const openMenu = Boolean(anchorEl);

  if (orderQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (!order) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Orden no encontrada</Typography>
      </Box>
    );
  }

  const canEdit = ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'WARRANTY', 'CANCELLED', 'COMPLETED'].includes(
    order.status
  );
  const canDelete = ['DRAFT', 'CANCELLED'].includes(order.status);
  const canAddPayment = ['CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED'].includes(
    order.status
  );
  const canApplyDiscount =
    permissions.includes('apply_discounts') &&
    ['CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'WARRANTY'].includes(
      order.status
    );
  const canDeleteDiscount =
    permissions.includes('delete_discounts');
  const isAdmin = user?.role?.name === 'admin';
  const hasIva = parseFloat(order.tax) > 0;
  const canRegisterInvoice =
    hasIva && order.status !== 'DRAFT' && permissions.includes('update_orders');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleChangeStatus = async (newStatus: OrderStatus) => {
    await updateStatusMutation.mutateAsync(newStatus);
    handleMenuClose();
  };

  const handleDelete = async () => {
    await deleteOrderMutation.mutateAsync();
    navigate('/orders');
  };

  const handleAddPayment = async () => {
    const payment = await addPaymentMutation.mutateAsync(paymentData);

    // Si hay archivo, subirlo
    if (receiptFile && payment) {
      try {
        await ordersApi.uploadPaymentReceipt(id!, payment.id, receiptFile);
        await paymentsQuery.refetch();
        enqueueSnackbar('Pago registrado con comprobante exitosamente', {
          variant: 'success'
        });
      } catch (error) {
        console.error('Error uploading receipt:', error);
        enqueueSnackbar('Pago registrado pero hubo un error al subir el comprobante', {
          variant: 'warning'
        });
      }
    } else {
      enqueueSnackbar('Pago registrado exitosamente', { variant: 'success' });
    }

    setPaymentDialogOpen(false);
    setPaymentData({
      amount: 0,
      paymentMethod: 'CASH',
      paymentDate: new Date().toISOString(),
    });
    setReceiptFile(null);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewReceipt = async (receiptFileId: string) => {
    try {
      const [urlResponse, fileData] = await Promise.all([
        storageApi.getFileUrl(receiptFileId),
        storageApi.getFile(receiptFileId),
      ]);

      setViewReceiptDialog({
        open: true,
        url: urlResponse.url,
        mimeType: fileData.mimeType,
      });
    } catch (error) {
      console.error('Error viewing receipt:', error);
      enqueueSnackbar('Error al ver el comprobante', { variant: 'error' });
    }
  };

  const handleCloseViewReceipt = () => {
    setViewReceiptDialog({ open: false, url: '', mimeType: '' });
  };

  const handleOpenInvoiceDialog = () => {
    setInvoiceNumber(order.electronicInvoiceNumber || '');
    setInvoiceDialogOpen(true);
  };

  const handleCloseInvoiceDialog = () => {
    setInvoiceDialogOpen(false);
    setInvoiceNumber('');
  };

  const handleRegisterInvoice = async () => {
    if (!invoiceNumber.trim()) return;
    setInvoiceLoading(true);
    try {
      await ordersApi.registerElectronicInvoice(id!, invoiceNumber.trim());
      await orderQuery.refetch();
      enqueueSnackbar('Número de factura electrónica registrado exitosamente', { variant: 'success' });
      handleCloseInvoiceDialog();
    } catch (error: any) {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al registrar la factura electrónica',
        { variant: 'error' }
      );
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleDownloadReceipt = async (receiptFileId: string) => {
    try {
      // Usar axiosInstance para descargar con el token
      const downloadUrl = `/storage/${receiptFileId}/download`;

      const response = await axiosInstance.get(downloadUrl, {
        responseType: 'blob', // Important: Get as blob
      });

      // Obtener nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers['content-disposition'];
      console.log('Content-Disposition:', contentDisposition);

      let fileName = 'comprobante';

      if (contentDisposition) {
        // Primero intentar con filename* (RFC 5987) que soporta UTF-8
        const rfc5987Match = /filename\*=UTF-8''([^;\n]+)/i.exec(contentDisposition);
        if (rfc5987Match && rfc5987Match[1]) {
          fileName = decodeURIComponent(rfc5987Match[1]);
          console.log('Filename from RFC 5987:', fileName);
        } else {
          // Fallback a filename regular
          const regularMatch = /filename="([^"]+)"/i.exec(contentDisposition);
          if (regularMatch && regularMatch[1]) {
            fileName = regularMatch[1];
            console.log('Filename from regular:', fileName);
          }
        }
      }

      console.log('Final filename:', fileName);

      // Crear blob URL y descargar
      const blob = new Blob([response.data]);
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpiar blob URL
      window.URL.revokeObjectURL(blobUrl);

      enqueueSnackbar('Archivo descargado', { variant: 'success' });
    } catch (error) {
      console.error('Error downloading receipt:', error);
      enqueueSnackbar('Error al descargar el comprobante', { variant: 'error' });
    }
  };

  const handleApplyDiscount = async (discountDto: ApplyDiscountDto) => {
    await ordersApi.applyDiscount(id!, discountDto);
    await orderQuery.refetch();
  };

  const handleRemoveDiscount = async (discountId: string) => {
    setDeletingDiscount(true);
    try {
      await ordersApi.removeDiscount(id!, discountId);
      await orderQuery.refetch();
      enqueueSnackbar('Descuento eliminado exitosamente', {
        variant: 'success',
      });
    } catch (error: any) {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al eliminar descuento',
        { variant: 'error' }
      );
    } finally {
      setDeletingDiscount(false);
    }
  };

  const handleDeleteReceipt = async (paymentId: string) => {
    try {
      setDeletingReceipt(paymentId);
      await ordersApi.deletePaymentReceipt(id!, paymentId);
      await paymentsQuery.refetch();
      enqueueSnackbar('Comprobante eliminado exitosamente', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      enqueueSnackbar('Error al eliminar el comprobante', { variant: 'error' });
    } finally {
      setDeletingReceipt(null);
    }
  };

  const balance = parseFloat(order.balance);

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={`Orden ${order.orderNumber}`}
        breadcrumbs={[
          { label: 'Órdenes', path: '/orders' },
          { label: order.orderNumber },
        ]}
      />

      {/* Banner de permiso activo */}
      <ActivePermissionBanner orderId={id!} />

      {/* Toolbar de Acciones */}
      <Paper
        elevation={0}
        sx={{
          mt: 2,
          mb: 3,
          p: 0,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.04)'
              : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          border: (theme) =>
            `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        <Stack
          direction="row"
          spacing={0}
          alignItems="stretch"
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ my: 1.5, opacity: 0.5 }}
            />
          }
        >
          {canEdit && (
            <ToolbarButton
              icon={<EditIcon />}
              label="Editar"
              onClick={() => navigate(`/orders/${id}/edit`)}
              tooltip="Editar Orden"
            />
          )}

          <RequestEditPermissionButton
            orderId={id!}
            orderStatus={order.status}
          />

          {canAddPayment && balance > 0 && (
            <ToolbarButton
              icon={<PaymentIcon />}
              label="Pago"
              secondaryLabel="Registrar"
              onClick={() => setPaymentDialogOpen(true)}
              color={theme.palette.success.main}
              tooltip="Registrar Pago"
            />
          )}

          {canApplyDiscount && (
            <ToolbarButton
              icon={<DiscountIcon />}
              label="Descuento"
              onClick={() => setDiscountDialogOpen(true)}
              color={theme.palette.warning.main}
              tooltip="Aplicar Descuento"
            />
          )}

          {canRegisterInvoice && (
            <ToolbarButton
              icon={<ReceiptIcon />}
              label="Factura"
              secondaryLabel={order.electronicInvoiceNumber ? 'Actualizar' : 'Registrar'}
              onClick={handleOpenInvoiceDialog}
              color={theme.palette.info.main}
              tooltip={order.electronicInvoiceNumber ? 'Actualizar Factura Electrónica' : 'Registrar Factura Electrónica'}
            />
          )}

          <ToolbarButton
            icon={<RefreshIcon />}
            label="Estado"
            onClick={handleMenuOpen}
            tooltip="Cambiar Estado"
          />

          <OrderPdfButton order={order} />

          <ToolbarButton
            icon={<AccountTreeIcon />}
            label="Trazabilidad"
            onClick={() => navigate(`/orders/flow/order/${id}`)}
            tooltip="Ver Trazabilidad"
          />

          <ToolbarButton
            icon={<AddIcon />}
            label="Nueva"
            onClick={() => navigate('/orders/new')}
            tooltip="Nueva Orden"
          />
        </Stack>
      </Paper>

      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mt: 1 }}>
        {/* Info General */}
        <Grid item xs={12} md={8}>
          <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            {/* Estado y Fechas */}
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  {/* Estado */}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Estado
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <OrderStatusChip status={order.status} size="medium" />
                    </Box>
                  </Grid>

                  {/* Fecha de Orden */}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Fecha de Orden
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="body1" fontWeight={500}>
                        {formatDateTime(order.orderDate)}
                      </Typography>
                    </Stack>
                  </Grid>

                  {/* Fecha de Entrega */}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Fecha de Entrega
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="body1" fontWeight={500}>
                        {order.deliveryDate ? formatDate(order.deliveryDate) : 'No especificada'}
                      </Typography>
                    </Stack>
                  </Grid>

                  {/* Información de cambio de fecha (si existe) */}
                  {order.deliveryDateReason && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Paper
                        elevation={0}
                        sx={{
                          mt: 2,
                          p: 2.5,
                          bgcolor: 'warning.lighter',
                          border: '1px solid',
                          borderColor: 'warning.light',
                          borderRadius: 2,
                        }}
                      >
                        <Stack spacing={1.5}>
                          {/* Header con ícono */}
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarIcon fontSize="small" color="warning" />
                            <Typography variant="subtitle2" color="warning.dark" fontWeight={600}>
                              Historial de Cambio de Fecha
                            </Typography>
                          </Stack>

                          {/* Fechas anterior y nueva */}
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Fecha anterior:
                              </Typography>
                              <Typography variant="body2" fontWeight={500} color="text.primary">
                                {order.previousDeliveryDate ? formatDate(order.previousDeliveryDate) : '-'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Nueva fecha:
                              </Typography>
                              <Typography variant="body2" fontWeight={500} color="text.primary">
                                {order.deliveryDate ? formatDate(order.deliveryDate) : '-'}
                              </Typography>
                            </Grid>
                          </Grid>

                          <Divider sx={{ borderStyle: 'dashed' }} />

                          {/* Razón del cambio */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                              Razón del cambio:
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.primary"
                              sx={{
                                bgcolor: 'background.paper',
                                p: 1.5,
                                borderRadius: 1,
                                fontStyle: 'italic',
                              }}
                            >
                              "{order.deliveryDateReason}"
                            </Typography>
                          </Box>

                          {/* Footer con fecha y usuario de modificación */}
                          {order.deliveryDateChangedAt && (
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ pt: 0.5 }}>
                              {order.deliveryDateChangedByUser && (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Typography variant="caption" color="text.secondary" style={{ fontStyle: "italic" }}>
                                    Modificada por:{" "}
                                    {order.deliveryDateChangedByUser.firstName || order.deliveryDateChangedByUser.lastName
                                      ? `${order.deliveryDateChangedByUser.firstName || ''} ${order.deliveryDateChangedByUser.lastName || ''}`.trim()
                                      : order.deliveryDateChangedByUser.email}
                                  </Typography>
                                </Stack>
                              )}
                              <Typography variant="caption" color="text.secondary" style={{ fontStyle: "italic" }}>
                                El: {formatDate(order.deliveryDateChangedAt)}
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Items de la Orden
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Descripción</TableCell>
                        <TableCell>Áreas de Producción</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell align="right">Precio Unit.</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.product && (
                              <Chip
                                label={item.product.name}
                                size="small"
                                sx={{ mr: 1, mb: 0.5 }}
                              />
                            )}
                            <Typography variant="body2">
                              {item.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {item.productionAreas && item.productionAreas.length > 0 ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {item.productionAreas.map((pa) => (
                                  <Chip
                                    key={pa.productionArea.id}
                                    label={pa.productionArea.name}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={500}>
                              {formatCurrency(item.total)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Totales */}
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Subtotal:</Typography>
                      <Typography fontWeight={500}>
                        {formatCurrency(order.subtotal)}
                      </Typography>
                    </Box>
                    {parseFloat(order.tax) > 0 && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography>
                          IVA ({(parseFloat(order.taxRate) * 100).toFixed(1)}%):
                        </Typography>
                        <Typography fontWeight={500}>
                          {formatCurrency(order.tax)}
                        </Typography>
                      </Box>
                    )}
                    {order.requiresColorProof && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography>
                          Prueba de Color:
                        </Typography>
                        <Typography fontWeight={500}>
                          {formatCurrency(order.colorProofPrice)}
                        </Typography>
                      </Box>
                    )}
                    {parseFloat(order.discountAmount) > 0 && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography color="error.main">
                          Descuentos:
                        </Typography>
                        <Typography fontWeight={500} color="error.main">
                          -{formatCurrency(order.discountAmount)}
                        </Typography>
                      </Box>
                    )}
                    <Divider />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6" color="primary.main">
                        {formatCurrency(order.total)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Pagado:</Typography>
                      <Typography fontWeight={500} color="success.main">
                        {formatCurrency(order.paidAmount)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="h6">Saldo:</Typography>
                      <Typography
                        variant="h6"
                        color={balance > 0 ? 'warning.main' : 'success.main'}
                      >
                        {formatCurrency(order.balance)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </CardContent>
            </Card>

            {/* Historial de Pagos */}
            {payments.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Historial de Pagos
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Método</TableCell>
                          <TableCell>Referencia</TableCell>
                          <TableCell align="right">Monto</TableCell>
                          <TableCell>Recibido por</TableCell>
                          <TableCell align="center">Comprobante</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {formatDateTime(payment.paymentDate)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{payment.reference || '-'}</TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={500}>
                                {formatCurrency(payment.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {payment.receivedBy.firstName}{' '}
                              {payment.receivedBy.lastName}
                            </TableCell>
                            <TableCell align="center">
                              {payment.receiptFileId ? (
                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewReceipt(payment.receiptFileId!)}
                                    color="info"
                                    title="Ver comprobante"
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownloadReceipt(payment.receiptFileId!)}
                                    color="primary"
                                    title="Descargar comprobante"
                                  >
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                  {isAdmin && (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteReceipt(payment.id)}
                                      color="error"
                                      disabled={deletingReceipt === payment.id}
                                      title="Eliminar comprobante (solo admin)"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </Stack>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Descuentos Aplicados */}
            <DiscountsSection
              discounts={discounts}
              canDelete={canDeleteDiscount}
              onDelete={handleRemoveDiscount}
              isDeleting={deletingDiscount}
            />
            {/* Notas y Detalles Adicionales */}
            {(order.notes || order.requiresColorProof) && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Observaciones y Detalles
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {order.requiresColorProof && (
                    <Typography variant="body2" sx={{ mb: order.notes ? 1 : 0, fontWeight: 500, color: 'primary.main' }}>
                      ✓ Requiere prueba de color
                    </Typography>
                  )}
                  {order.notes && (
                    <Typography variant="body2">{order.notes}</Typography>
                  )}
                </CardContent>
              </Card>
            )}            
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            {/* Cliente */}
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <PersonIcon color="primary" />
                  <Typography variant="h6">Cliente</Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {order.client.name}
                  </Typography>
                  {order.client.email && (
                    <Typography variant="body2" color="textSecondary">
                      {order.client.email}
                    </Typography>
                  )}
                  {order.client.phone && (
                    <Typography variant="body2" color="textSecondary">
                      {order.client.phone}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Información Adicional */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información Adicional
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Creado por
                    </Typography>
                    <Typography variant="body2">
                      {order.createdBy.firstName && order.createdBy.lastName
                        ? `${order.createdBy.firstName} ${order.createdBy.lastName}`
                        : order.createdBy.email}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Fecha de creación
                    </Typography>
                    <Typography variant="body2">
                      {formatDateTime(order.createdAt)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Canal de Venta
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {order.commercialChannel?.name || 'No especificado'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Última actualización
                    </Typography>
                    <Typography variant="body2">
                      {formatDateTime(order.updatedAt)}
                    </Typography>
                  </Box>
                  {order.electronicInvoiceNumber && (
                    <Box>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                        <ReceiptIcon fontSize="small" color="info" />
                        <Typography variant="body2" color="textSecondary">
                          N° Factura Electrónica
                        </Typography>
                      </Stack>
                      <Typography variant="body2" fontWeight={600} color="info.dark" fontFamily="monospace">
                        {order.electronicInvoiceNumber}
                      </Typography>
                    </Box>
                  )}
                  {/* Orden de Trabajo vinculada */}
                  <Box>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                      <BuildIcon fontSize="small" color={order.workOrders?.[0] ? 'primary' : 'disabled'} />
                      <Typography variant="body2" color="textSecondary">
                        Orden de Trabajo
                      </Typography>
                    </Stack>
                    {order.workOrders?.[0] ? (
                      <Chip
                        icon={<OpenInNewIcon sx={{ fontSize: '0.85rem !important' }} />}
                        label={order.workOrders[0].workOrderNumber}
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => navigate(ROUTES.WORK_ORDERS_DETAIL.replace(':id', order.workOrders![0].id))}
                        sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        Sin OT asignada
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Solicitudes de Edición e Historial de Cambios */}
      <Box sx={{ mt: 4 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Solicitudes de Edición" />
          <Tab label="Historial de Cambios" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <EditRequestsList orderId={id!} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <OrderChangeHistoryTab orderId={id!} orderNumber={order.orderNumber} />
        </TabPanel>
      </Box>

      {/* Menu de Acciones */}
      <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>
        <MenuItem disabled>
          <Typography variant="caption" color="textSecondary">
            Cambiar Estado de la Orden
          </Typography>
        </MenuItem>
        {Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => (
          <MenuItem
            key={status}
            onClick={() => handleChangeStatus(status as OrderStatus)}
            disabled={order.status === status}
          >
            <Chip
              label={config.label}
              color={config.color}
              size="small"
              sx={{ mr: 1 }}
            />
          </MenuItem>
        ))}
        <Divider />
        {canDelete && (
          <MenuItem onClick={() => setConfirmDelete(true)} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
            Eliminar Orden
          </MenuItem>
        )}
      </Menu>

      {/* Dialog: Registrar Pago */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Registrar Pago</DialogTitle>
        <DialogContent onPaste={handleReceiptPaste}>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Monto"
              value={paymentData.amount ? formatCurrencyInput(paymentData.amount) : ''}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\D/g, '');
                const amount = rawValue ? parseInt(rawValue, 10) : 0;
                setPaymentData({
                  ...paymentData,
                  amount,
                });
              }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
              inputProps={{
                style: { textAlign: 'right' },
              }}
              helperText={`Saldo pendiente: ${formatCurrency(order.balance)}`}
            />

            <FormControl fullWidth>
              <InputLabel id="payment-method-label">Método de Pago</InputLabel>
              <Select
                labelId="payment-method-label"
                id="payment-method-select"
                value={paymentData.paymentMethod}
                label="Método de Pago"
                onChange={(e) =>
                  setPaymentData({
                    ...paymentData,
                    paymentMethod: e.target.value as PaymentMethod,
                  })
                }
              >
                {(
                  Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]
                ).map(([method, label]) => (
                  <MenuItem key={method} value={method}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <DatePicker
              label="Fecha de Pago"
              value={new Date(paymentData.paymentDate || new Date())}
              onChange={(date) =>
                setPaymentData({
                  ...paymentData,
                  paymentDate: date?.toISOString() || new Date().toISOString(),
                })
              }
              slotProps={{
                textField: { fullWidth: true },
              }}
            />

            <TextField
              fullWidth
              label="Número de Referencia"
              value={paymentData.reference || ''}
              onChange={(e) =>
                setPaymentData({ ...paymentData, reference: e.target.value })
              }
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notas"
              value={paymentData.notes || ''}
              onChange={(e) =>
                setPaymentData({ ...paymentData, notes: e.target.value })
              }
            />

            <Box>
              <FormLabel sx={{ mb: 1, display: 'block' }}>
                Comprobante de Pago (Opcional)
              </FormLabel>
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/gif,image/webp,.pdf"
                ref={receiptFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setReceiptFile(file);
                  if (e.target) e.target.value = '';
                }}
              />

              {!receiptFile ? (
                <Stack spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<AttachFileIcon />}
                    size="small"
                    onClick={() => receiptFileInputRef.current?.click()}
                    sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                  >
                    Adjuntar imagen o PDF
                  </Button>
                  <Box
                    onPaste={handleReceiptPaste}
                    tabIndex={0}
                    sx={{
                      border: '2px dashed',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      p: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, background-color 0.2s',
                      '&:hover, &:focus': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ImageIcon sx={{ fontSize: 28, color: 'grey.400', mb: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" display="block">
                      O pega una imagen aquí (Ctrl+V / ⌘+V)
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  {/* Thumbnail preview (only for images) */}
                  {receiptFile.type.startsWith('image/') && (
                    <Box
                      sx={{
                        position: 'relative',
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
                        alt="Vista previa"
                        sx={{
                          display: 'block',
                          maxWidth: 200,
                          maxHeight: 140,
                          objectFit: 'contain',
                        }}
                        onLoad={(e) => {
                          URL.revokeObjectURL((e.target as HTMLImageElement).src);
                        }}
                      />
                    </Box>
                  )}
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip
                      icon={receiptFile.type.startsWith('image/') ? <ImageIcon /> : <AttachFileIcon />}
                      label={`${receiptFile.name} (${(receiptFile.size / 1024).toFixed(1)} KB)`}
                      color="primary"
                      variant="outlined"
                      size="small"
                      onDelete={() => {
                        setReceiptFile(null);
                        if (receiptFileInputRef.current) receiptFileInputRef.current.value = '';
                      }}
                      deleteIcon={<CloseIcon />}
                      sx={{ maxWidth: 320 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => receiptFileInputRef.current?.click()}
                      title="Cambiar archivo"
                    >
                      <AttachFileIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleAddPayment}
            variant="contained"
            disabled={
              addPaymentMutation.isPending || paymentData.amount <= 0
            }
          >
            Registrar Pago
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar Orden"
        message={`¿Está seguro que desea eliminar la orden ${order.orderNumber}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        isLoading={deleteOrderMutation.isPending}
      />

      {/* Dialog: Aplicar Descuento */}
      <ApplyDiscountDialog
        open={discountDialogOpen}
        onClose={() => setDiscountDialogOpen(false)}
        onApply={handleApplyDiscount}
        maxAmount={parseFloat(order.subtotal) + parseFloat(order.tax)}
      />

      {/* Dialog: Ver Comprobante */}
      <Dialog
        open={viewReceiptDialog.open}
        onClose={handleCloseViewReceipt}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Comprobante de Pago
          <IconButton
            onClick={handleCloseViewReceipt}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400,
              bgcolor: 'grey.100',
              borderRadius: 1,
              p: 2,
            }}
          >
            {viewReceiptDialog.mimeType.startsWith('image/') ? (
              <Box
                component="img"
                src={viewReceiptDialog.url}
                alt="Comprobante de pago"
                sx={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                }}
              />
            ) : viewReceiptDialog.mimeType === 'application/pdf' ? (
              <iframe
                src={viewReceiptDialog.url}
                title="Comprobante de pago PDF"
                style={{
                  width: '100%',
                  height: '70vh',
                  border: 'none',
                }}
              />
            ) : (
              <Typography color="text.secondary">
                No se puede visualizar este tipo de archivo
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewReceipt}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Registrar Número de Factura Electrónica */}
      <Dialog
        open={invoiceDialogOpen}
        onClose={handleCloseInvoiceDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <ReceiptIcon color="info" />
            <span>{order.electronicInvoiceNumber ? 'Actualizar Factura Electrónica' : 'Registrar Factura Electrónica'}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Ingrese el número de factura electrónica asociado a esta orden. Este número es alfanumérico y tiene un máximo de 30 caracteres.
            </Typography>
            <TextField
              fullWidth
              label="Número de Factura Electrónica"
              value={invoiceNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z0-9\-_./]/g, '');
                if (val.length <= 30) setInvoiceNumber(val);
              }}
              inputProps={{ maxLength: 30 }}
              helperText={`${invoiceNumber.length}/30 caracteres. Solo se permiten letras, números y los símbolos - _ . /`}
              disabled={invoiceLoading}
              autoFocus
              placeholder="Ej: FE-2026-00123"
            />
            {order.electronicInvoiceNumber && (
              <Typography variant="caption" color="text.secondary">
                Número actual: <strong>{order.electronicInvoiceNumber}</strong>
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInvoiceDialog} disabled={invoiceLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleRegisterInvoice}
            variant="contained"
            color="info"
            disabled={invoiceLoading || !invoiceNumber.trim()}
            startIcon={<ReceiptIcon />}
          >
            {invoiceLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderDetailPage;
