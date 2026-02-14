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
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Paper,
} from '@mui/material';

import {
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Discount as DiscountIcon,
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
} from '../components';
import { ActivePermissionBanner } from '../components/ActivePermissionBanner';
import { RequestEditPermissionButton } from '../components/RequestEditPermissionButton';
import { EditRequestsList } from '../components/EditRequestsList';
import { OrderChangeHistoryTab } from '../components/OrderChangeHistoryTab';
import { ordersApi } from '../../../api/orders.api';
import { storageApi } from '../../../api/storage.api';
import axiosInstance from '../../../api/axios';
import { useAuthStore } from '../../../store/authStore';
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
  const [deletingReceipt, setDeletingReceipt] = useState<string | null>(null);
  const [deletingDiscount, setDeletingDiscount] = useState(false);
  const [viewReceiptDialog, setViewReceiptDialog] = useState<{
    open: boolean;
    url: string;
    mimeType: string;
  }>({ open: false, url: '', mimeType: '' });

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

  const canEdit = order.status === 'DRAFT';
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
        elevation={1}
        sx={{
          mt: 2,
          mb: 3,
          p: { xs: 1.5, sm: 2, md: 2.5 },
          borderRadius: 2,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
              : 'linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.01) 100%)',
          border: (theme) =>
            `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <Stack
          direction="row"
          spacing={{ xs: 1, sm: 1.5, md: 2 }}
          alignItems="center"
          justifyContent="center"
          flexWrap="wrap"
          sx={{ gap: { xs: 1, sm: 1.5 } }}
        >
          {/* Grupo 1: Edición y Permisos */}
          {canEdit && (
            isMobile ? (
              <Tooltip title="Editar">
                <IconButton
                  color="primary"
                  onClick={() => navigate(`/orders/${id}/edit`)}
                  size="small"
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/orders/${id}/edit`)}
                size="medium"
                sx={{ minWidth: { sm: 'auto', md: 120 } }}
              >
                Editar
              </Button>
            )
          )}
          
          {!isMobile && (
            <RequestEditPermissionButton
              orderId={id!}
              orderStatus={order.status}
            />
          )}

          {/* Divider */}
          {!isMobile && (canEdit || canAddPayment || canApplyDiscount) && (
            <Divider 
              orientation="vertical" 
              flexItem 
              sx={{ 
                display: { xs: 'none', md: 'block' },
                mx: 0.5 
              }} 
            />
          )}

          {/* Grupo 2: Acciones Financieras */}
          {canAddPayment && balance > 0 && (
            isMobile ? (
              <Tooltip title="Pago">
                <IconButton
                  color="success"
                  onClick={() => setPaymentDialogOpen(true)}
                  size="small"
                  sx={{
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    '&:hover': {
                      bgcolor: 'success.dark',
                    },
                  }}
                >
                  <PaymentIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                variant="contained"
                color="success"
                startIcon={<PaymentIcon />}
                onClick={() => setPaymentDialogOpen(true)}
                size="medium"
                sx={{ minWidth: { sm: 'auto', md: 120 } }}
              >
                Registrar Pago
              </Button>
            )
          )}
          
          {canApplyDiscount && (
            isMobile ? (
              <Tooltip title="Descuento">
                <IconButton
                  color="warning"
                  onClick={() => setDiscountDialogOpen(true)}
                  size="small"
                  sx={{
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    '&:hover': {
                      bgcolor: 'warning.dark',
                    },
                  }}
                >
                  <DiscountIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                variant="contained"
                color="warning"
                startIcon={<DiscountIcon />}
                onClick={() => setDiscountDialogOpen(true)}
                size="medium"
                sx={{ minWidth: { sm: 'auto', md: 120 } }}
              >
                Descuento
              </Button>
            )
          )}

          {/* Divider */}
          {!isMobile && (
            <Divider 
              orientation="vertical" 
              flexItem 
              sx={{ 
                display: { xs: 'none', md: 'block' },
                mx: 0.5 
              }} 
            />
          )}

          {/* Grupo 3: Estado y Documentos */}
          {isMobile ? (
            <Tooltip title="Estado">
              <IconButton
                color="primary"
                onClick={handleMenuOpen}
                size="small"
                sx={{
                  bgcolor: 'action.hover',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              variant="outlined"
              onClick={handleMenuOpen}
              endIcon={<ArrowDropDownIcon />}
              startIcon={<RefreshIcon />}
              size="medium"
              sx={{ minWidth: { sm: 'auto', md: 120 } }}
            >
              Estado
            </Button>
          )}
          
          <OrderPdfButton order={order} />

          {/* Divider */}
          {!isMobile && (
            <Divider 
              orientation="vertical" 
              flexItem 
              sx={{ 
                display: { xs: 'none', md: 'block' },
                mx: 0.5 
              }} 
            />
          )}

          {/* Grupo 4: Nueva Orden */}
          {isMobile ? (
            <Tooltip title="Nueva">
              <IconButton
                color="primary"
                onClick={() => navigate('/orders/new')}
                size="small"
                sx={{
                  bgcolor: 'action.hover',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/orders/new')}
              size="medium"
              sx={{ minWidth: { sm: 'auto', md: 120 } }}
            >
              Nueva
            </Button>
          )}

          {/* RequestEditPermissionButton en mobile */}
          {isMobile && (
            <RequestEditPermissionButton
              orderId={id!}
              orderStatus={order.status}
            />
          )}
        </Stack>
      </Paper>

      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mt: 1 }}>
        {/* Info General */}
        <Grid item xs={12} md={8}>
          <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            {/* Estado y Fechas */}
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="textSecondary">
                      Estado
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <OrderStatusChip status={order.status} size="medium" />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="textSecondary">
                      Fecha de Orden
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="body1">
                        {formatDate(order.orderDate)}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="textSecondary">
                      Fecha de Entrega
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="body1">
                        {order.deliveryDate ? formatDate(order.deliveryDate) : 'No especificada'}
                      </Typography>
                    </Stack>
                  </Grid>
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
                            {item.service && (
                              <Chip
                                label={item.service.name}
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

            {/* Notas */}
            {order.notes && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Observaciones
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2">{order.notes}</Typography>
                </CardContent>
              </Card>
            )}

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
        <DialogContent>
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

            <FormControl>
              <FormLabel>Método de Pago</FormLabel>
              <RadioGroup
                value={paymentData.paymentMethod}
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
                  <FormControlLabel
                    key={method}
                    value={method}
                    control={<Radio size="small" />}
                    label={label}
                  />
                ))}
              </RadioGroup>
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
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                fullWidth
              >
                {receiptFile ? receiptFile.name : 'Seleccionar archivo (imagen o PDF)'}
                <input
                  type="file"
                  hidden
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setReceiptFile(file);
                    }
                  }}
                />
              </Button>
              {receiptFile && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {(receiptFile.size / 1024).toFixed(2)} KB
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setReceiptFile(null)}
                    color="error"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
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
    </Box>
  );
};

export default OrderDetailPage;
