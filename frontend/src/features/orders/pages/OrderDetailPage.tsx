import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  IconButton,
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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Storefront as ChannelIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useOrder, useOrderPayments } from '../hooks';
import { OrderStatusChip } from '../components';
import { ActivePermissionBanner } from '../components/ActivePermissionBanner';
import { RequestEditPermissionButton } from '../components/RequestEditPermissionButton';
import { EditRequestsList } from '../components/EditRequestsList';
import { OrderChangeHistoryTab } from '../components/OrderChangeHistoryTab';
import type {
  OrderStatus,
  PaymentMethod,
  CreatePaymentDto,
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

  const { orderQuery, updateStatusMutation, deleteOrderMutation } = useOrder(
    id!
  );
  const { paymentsQuery, addPaymentMutation } = useOrderPayments(id!);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [paymentData, setPaymentData] = useState<CreatePaymentDto>({
    amount: 0,
    paymentMethod: 'CASH',
    paymentDate: new Date().toISOString(),
  });

  const order = orderQuery.data;
  const payments = paymentsQuery.data || [];

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
    await addPaymentMutation.mutateAsync(paymentData);
    setPaymentDialogOpen(false);
    setPaymentData({
      amount: 0,
      paymentMethod: 'CASH',
      paymentDate: new Date().toISOString(),
    });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
        action={
          <Stack direction="row" spacing={1}>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/orders/${id}/edit`)}
              >
                Editar
              </Button>
            )}
            <RequestEditPermissionButton
              orderId={id!}
              orderStatus={order.status}
            />
            {canAddPayment && balance > 0 && (
              <Button
                variant="contained"
                startIcon={<PaymentIcon />}
                onClick={() => setPaymentDialogOpen(true)}
              >
                Registrar Pago
              </Button>
            )}
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
          </Stack>
        }
      />

      {/* Banner de permiso activo */}
      <ActivePermissionBanner orderId={id!} />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Info General */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Estado y Fechas */}
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">
                      Estado
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <OrderStatusChip status={order.status} size="medium" />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={3}>
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
                  <Grid item xs={12} sm={3}>
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
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">
                      Canal de Venta
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      <ChannelIcon fontSize="small" color="action" />
                      <Typography variant="body1">
                        {order.commercialChannel?.name || 'No especificado'}
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardContent>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
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
            Cambiar Estado
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
    </Box>
  );
};

export default OrderDetailPage;
