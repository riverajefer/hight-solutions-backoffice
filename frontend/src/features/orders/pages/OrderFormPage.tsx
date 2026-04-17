import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  Stack,
  Grid,
  Typography,
  Divider,
  MenuItem,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { commercialChannelsApi } from '../../../api/commercialChannels.api';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DateTimePicker } from '@mui/x-date-pickers';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as AttachMoneyIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useOrders, useOrder } from '../hooks';
import { ordersApi } from '../../../api/orders.api';
import { useEditRequests } from '../../../hooks/useEditRequests';
import {
  ClientSelector,
  OrderItemsTable,
  OrderTotals,
  InitialPayment,
  ActivePermissionBanner,
} from '../components';
import type { Client } from '../../../types/client.types';
import { useAuthStore } from '../../../store/authStore';
import { enqueueSnackbar } from 'notistack';
import { storageApi } from '../../../api/storage.api';
import { useQueryClient } from '@tanstack/react-query';

// ============================================================
// VALIDATION SCHEMA
// ============================================================

const orderItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'La descripción es requerida'),
  quantity: z.string().min(1, 'La cantidad es requerida'),
  unitPrice: z.string().min(1, 'El precio unitario es requerido'),
  total: z.number().min(0),
  productId: z.string().optional(),
  specifications: z.record(z.any()).optional(),
  sampleImageId: z.string().nullable().optional(),
  productionAreaIds: z.array(z.string()),
});

const initialPaymentSchema = z
  .object({
    amount: z.number().min(0, 'El monto del abono inicial no puede ser negativo'),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CARD', 'CREDIT', 'CREDIT_BALANCE']),
    reference: z.string().optional(),
    notes: z.string().optional(),
    receiptFile: z.any().optional(),
    receiptFileUrl: z.any().optional(),
  })
  .refine(
    (data) => {
      if (data.paymentMethod === 'CREDIT') return data.amount >= 0;
      return data.amount > 0;
    },
    {
      message: 'El monto del abono inicial debe ser mayor a cero',
      path: ['amount'],
    }
  );

const orderFormSchema = z
  .object({
    client: z.custom<Client | null>((val) => val !== null, {
      message: 'Debe seleccionar un cliente',
    }).nullable(),
    deliveryDate: z.date().nullable(),
    deliveryDateReason: z.string().optional(),
    notes: z.string().optional(),
    requiresColorProof: z.boolean().default(false),
    colorProofPrice: z.number().min(0).optional(),
    items: z.array(orderItemSchema).min(1, 'Debe agregar al menos un item'),
    applyTax: z.boolean(),
    taxRate: z.number().min(0).max(100),
    useCreditBalance: z.boolean().optional(),
    payments: z.array(initialPaymentSchema).min(1),
    commercialChannelId: z.string().min(1, 'El canal de ventas es requerido'),
  })
  .refine(
    (data) => {
      return data.items.every((item) => {
        const qty = parseFloat(item.quantity);
        const price = parseFloat(item.unitPrice);
        return !isNaN(qty) && qty > 0 && !isNaN(price) && price > 0;
      });
    },
    {
      message: 'Todos los items deben tener cantidad y precio válidos',
      path: ['items'],
    }
  )
  .refine(
    (data) => {
      const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
      const tax = data.applyTax ? subtotal * (data.taxRate / 100) : 0;
      const colorProofPrice = data.requiresColorProof ? (data.colorProofPrice || 0) : 0;
      const total = subtotal + tax + colorProofPrice;
      const creditBalanceUsed = data.useCreditBalance && data.client ? Math.min(data.client.saldoAFavor || 0, total) : 0;
      const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
      return totalPaid <= (total - creditBalanceUsed);
    },
    {
      message: 'La suma de los anticipos no puede ser mayor al total de la orden',
      path: ['payments'],
    }
  )
  .refine(
    (data) => {
      const cashCount = data.payments.filter((p) => p.paymentMethod === 'CASH').length;
      return cashCount <= 1;
    },
    {
      message: 'Solo puede registrarse un anticipo en Efectivo',
      path: ['payments'],
    }
  )
  .refine(
    () => true,
    {
      message: 'Debe indicar la razón del cambio de fecha',
      path: ['deliveryDateReason'],
    }
  );

type OrderFormData = z.infer<typeof orderFormSchema>;

const formatCurrencyInput = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  const number = parseInt(numericValue, 10);
  return new Intl.NumberFormat('es-CO').format(number);
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

// ============================================================
// STEP CONFIG
// ============================================================

interface StepConfig {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
  { label: 'Cliente y Fechas', subtitle: 'Datos del cliente y canal de ventas', icon: <PersonIcon fontSize="small" /> },
  { label: 'Ítems de la Orden', subtitle: 'Productos y cantidades', icon: <ShoppingCartIcon fontSize="small" /> },
  { label: 'Totales y Pago', subtitle: 'Impuestos, abono y prueba de color', icon: <AttachMoneyIcon fontSize="small" /> },
  { label: 'Observaciones y Confirmar', subtitle: 'Notas finales y guardar', icon: <NotesIcon fontSize="small" /> },
];

// ============================================================
// STEP HEADER COMPONENT
// ============================================================

interface StepHeaderProps {
  index: number;
  config: StepConfig;
  status: 'active' | 'completed' | 'visited' | 'pending';
  clickable?: boolean;
  onClick?: () => void;
}

const StepHeader: React.FC<StepHeaderProps> = ({ index, config, status, clickable, onClick }) => {
  const theme = useTheme();
  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isVisited = status === 'visited';

  const successGreen = theme.palette.success.dark;

  const numberBg = isActive
    ? theme.palette.primary.main
    : isCompleted
    ? successGreen
    : isVisited
    ? theme.palette.warning.main
    : theme.palette.action.disabled;

  const borderColor = isActive
    ? alpha(theme.palette.primary.main, 0.2)
    : isVisited
    ? alpha(theme.palette.warning.main, 0.2)
    : 'transparent';

  const bgColor = isActive
    ? alpha(theme.palette.primary.main, 0.06)
    : isVisited
    ? alpha(theme.palette.warning.main, 0.06)
    : 'transparent';

  const labelColor = isActive
    ? theme.palette.primary.main
    : isCompleted
    ? successGreen
    : isVisited
    ? theme.palette.warning.main
    : theme.palette.text.primary;

  return (
    <Box
      onClick={clickable ? onClick : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        cursor: clickable ? 'pointer' : 'default',
        borderRadius: 2,
        bgcolor: bgColor,
        border: `1px solid ${borderColor}`,
        transition: 'all 0.2s ease',
        '&:hover': clickable ? { bgcolor: alpha(theme.palette.action.hover, 0.08) } : {},
      }}
    >
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: numberBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {index + 1}
        </Box>
        {isCompleted && (
          <CheckCircleIcon
            sx={{
              position: 'absolute',
              bottom: -4,
              right: -6,
              fontSize: 16,
              color: successGreen,
              bgcolor: 'background.paper',
              borderRadius: '50%',
            }}
          />
        )}
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={600} sx={{ color: labelColor }}>
          {config.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {config.subtitle}
        </Typography>
      </Box>
    </Box>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const OrderFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const isEdit = !!id;
  const { orderQuery, updateOrderMutation } = useOrder(id || '');
  const { createOrderMutation } = useOrders();
  const { activePermissionQuery } = useEditRequests(id || '');
  const isAdmin = user?.role?.name === 'admin';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const queryClient = useQueryClient();
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['commercial-channels'],
    queryFn: () => commercialChannelsApi.getAll(),
  });

  const currentUserFullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    : '';

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema) as Resolver<OrderFormData>,
    mode: 'onChange',
    defaultValues: {
      client: null,
      deliveryDate: null,
      deliveryDateReason: '',
      notes: '',
      requiresColorProof: false,
      colorProofPrice: undefined,
      items: [
        {
          id: uuidv4(),
          description: '',
          quantity: '',
          unitPrice: '',
          total: 0,
          productionAreaIds: [],
        },
      ],
      applyTax: false,
      taxRate: 19,
      useCreditBalance: false,
      payments: [
        {
          amount: 0,
          paymentMethod: 'CASH',
          reference: '',
          notes: '',
        },
      ],
      commercialChannelId: '',
    },
  });

  const selectedClient = watch('client');
  const items = watch('items');
  const applyTax = watch('applyTax');
  const taxRate = watch('taxRate');
  const deliveryDate = watch('deliveryDate');
  const requiresColorProof = watch('requiresColorProof');
  const colorProofPrice = requiresColorProof ? watch('colorProofPrice') || 0 : 0;
  const commercialChannelId = watch('commercialChannelId');

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = applyTax ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax + colorProofPrice;

  const saldoAFavor = selectedClient?.saldoAFavor || 0;
  const useCreditBalance = watch('useCreditBalance');
  const creditBalanceUsed = useCreditBalance ? Math.min(saldoAFavor, total) : 0;
  const remainingTotalAfterCredit = Math.max(0, total - creditBalanceUsed);

  const isClientSelected = !!selectedClient;

  const [isDatePostponed, setIsDatePostponed] = useState(false);
  const [originalDeliveryDate, setOriginalDeliveryDate] = useState<Date | null>(null);

  useEffect(() => {
    if (isEdit && orderQuery.data && deliveryDate) {
      const currentDate = orderQuery.data.deliveryDate ? new Date(orderQuery.data.deliveryDate) : null;
      const newDate = deliveryDate;
      if (currentDate && !originalDeliveryDate) setOriginalDeliveryDate(currentDate);
      if (originalDeliveryDate && newDate > originalDeliveryDate) {
        setIsDatePostponed(true);
      } else {
        setIsDatePostponed(false);
        setValue('deliveryDateReason', '');
      }
    }
  }, [deliveryDate, isEdit, orderQuery.data, originalDeliveryDate, setValue]);

  useEffect(() => {
    if (!isEdit && selectedClient) {
      setValue('applyTax', selectedClient.personType === 'EMPRESA');
    }
  }, [selectedClient, setValue, isEdit]);

  useEffect(() => {
    if (isEdit && orderQuery.data) {
      const order = orderQuery.data;
      const canEdit =
        order.status === 'DRAFT' ||
        isAdmin ||
        activePermissionQuery.data !== null;

      if (!canEdit) {
        enqueueSnackbar('No tienes permiso para editar esta orden', { variant: 'error' });
        navigate(`/orders/${id}`);
        return;
      }

      setValue('client', order.client as any);
      setValue('deliveryDate', order.deliveryDate ? new Date(order.deliveryDate) : null);
      setValue('notes', order.notes || '');
      setValue('requiresColorProof', order.requiresColorProof || false);
      setValue('colorProofPrice', order.colorProofPrice ? parseFloat(order.colorProofPrice) : 0);
      setValue(
        'items',
        order.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice,
          total: parseFloat(item.total),
          productId: item.product?.id,
          specifications: item.specifications || undefined,
          sampleImageId: item.sampleImageId,
          productionAreaIds: item.productionAreas
            ? item.productionAreas.map((pa) => pa.productionArea.id)
            : [],
        }))
      );
      const currentTaxRate = parseFloat(order.taxRate);
      setValue('applyTax', currentTaxRate > 0);
      setValue('taxRate', currentTaxRate > 0 ? currentTaxRate * 100 : 19);

      const firstPayment = order.payments && order.payments.length > 0 ? order.payments[0] : null;
      setValue('payments', [{
        amount: firstPayment ? parseFloat(firstPayment.amount) : 0,
        paymentMethod: firstPayment?.paymentMethod || 'CASH',
        reference: firstPayment?.reference || '',
        notes: firstPayment?.notes || '',
      }]);
      setValue('commercialChannelId', order.commercialChannelId || '');
      // En edición todos los pasos fueron completados
      setVisitedSteps(new Set([0, 1, 2, 3]));
    }
  }, [isEdit, orderQuery.data, id, navigate, setValue, isAdmin, activePermissionQuery.data]);

  // ── Step navigation ──────────────────────────────────────────────────────────

  const goToStep = (step: number) => {
    setActiveStep(step);
    setVisitedSteps((prev) => new Set([...prev, step]));
  };

  const hasValidItems = items.length > 0 && items.some((item) => item.description && item.quantity && item.unitPrice);

  const getStepStatus = (i: number): 'active' | 'completed' | 'visited' | 'pending' => {
    if (i === activeStep) return 'active';
    if (!visitedSteps.has(i)) return 'pending';
    // Validación básica por paso
    const validByStep = [
      isClientSelected && !!commercialChannelId,  // paso 0: cliente + canal de ventas
      hasValidItems,                  // paso 1: al menos un item completo
      hasValidItems,                  // paso 2: requiere items para tener sentido
      true,                           // paso 3
    ];
    return validByStep[i] ? 'completed' : 'visited';
  };

  const canGoNext = () => {
    if (activeStep === 0) return isClientSelected && !!commercialChannelId;
    if (activeStep === 1) return hasValidItems;
    if (activeStep === 2) return hasValidItems;
    return true;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const onSubmit: SubmitHandler<OrderFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const orderSubtotal = data.items.reduce((sum, i) => sum + i.total, 0);
      const orderTax = data.applyTax ? orderSubtotal * (data.taxRate / 100) : 0;
      const cpPrice = data.requiresColorProof ? (data.colorProofPrice || 0) : 0;
      const orderTotal = orderSubtotal + orderTax + cpPrice;
      const creditBalUsed = data.useCreditBalance ? Math.min(data.client!.saldoAFavor || 0, orderTotal) : 0;

      let initialPaymentsPayload = !isEdit ? data.payments.map((p) => ({
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        reference: p.reference,
        notes: p.notes,
      })) as any[] : undefined;

      if (!isEdit && creditBalUsed > 0) {
        initialPaymentsPayload = [
          {
            amount: creditBalUsed,
            paymentMethod: 'CREDIT_BALANCE',
            reference: 'Uso automático de saldo a favor',
            notes: '',
          },
          ...(initialPaymentsPayload || []),
        ];
      }

      const orderDto = {
        clientId: data.client!.id,
        deliveryDate: data.deliveryDate?.toISOString(),
        ...(isEdit && isDatePostponed && data.deliveryDateReason && {
          deliveryDateReason: data.deliveryDateReason,
        }),
        notes: data.notes,
        requiresColorProof: data.requiresColorProof,
        colorProofPrice: data.requiresColorProof ? data.colorProofPrice : 0,
        taxRate: data.applyTax ? data.taxRate / 100 : 0,
        items: data.items.map((item) => ({
          ...(isEdit && item.id && { id: item.id }),
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          productId: item.productId,
          specifications: item.specifications,
          sampleImageId: item.sampleImageId ?? undefined,
          productionAreaIds: item.productionAreaIds,
        })),
        // En edición solo se actualiza el primer pago como initialPayment (comportamiento existente)
        // En creación enviamos todos como initialPayments para que el backend los cree en una sola transacción
        initialPayment: isEdit ? {
          amount: data.payments[0].amount,
          paymentMethod: data.payments[0].paymentMethod,
          reference: data.payments[0].reference,
          notes: data.payments[0].notes,
        } : undefined,
        initialPayments: initialPaymentsPayload,
        commercialChannelId: data.commercialChannelId,
      };

      if (isEdit) {
        await updateOrderMutation.mutateAsync(orderDto);
        navigate(`/orders/${id}`);
      } else {
        const newOrder = await createOrderMutation.mutateAsync(orderDto);

        // Subir comprobantes de cada anticipo asociando por método+monto
        if (newOrder.payments && newOrder.payments.length > 0) {
          for (const dp of data.payments) {
            if (!dp.receiptFile) continue;
            const match = newOrder.payments.find(
              (p) => p.paymentMethod === dp.paymentMethod && Math.abs(parseFloat(p.amount as any) - dp.amount) < 1,
            );
            if (match) {
              try {
                await ordersApi.uploadPaymentReceipt(newOrder.id, match.id, dp.receiptFile);
              } catch (e: any) {
                console.error('Error al subir comprobante:', e);
                enqueueSnackbar('Orden creada, pero hubo un error subiendo un comprobante', { variant: 'warning' });
              }
            }
          }
        }

        enqueueSnackbar('Orden creada exitosamente', { variant: 'success' });
        navigate(`/orders/${newOrder.id}`);
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        enqueueSnackbar('Tu permiso de edición ha expirado. Solicita un nuevo permiso.', { variant: 'error' });
        navigate(`/orders/${id}`);
      } else {
        setIsSubmitting(false);
      }
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isEdit && orderQuery.isLoading) return <LoadingSpinner />;

  // ── Step renderers ────────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
            Cliente y Fechas
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={3}>
            <Controller
              name="client"
              control={control}
              render={({ field }) => (
                <ClientSelector
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.client}
                  helperText={errors.client?.message}
                  currentUserId={user?.id}
                  isAdmin={isAdmin}
                />
              )}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Fecha de Orden"
                value={new Date().toLocaleDateString('es-CO')}
                disabled={!isClientSelected}
                InputProps={{ readOnly: true }}
                helperText="Fecha de registro"
              />

              <Controller
                name="deliveryDate"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Fecha y Hora de Entrega (Opcional)"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={!isClientSelected}
                    minDateTime={new Date()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        helperText: isClientSelected ? 'Fecha y hora estimada' : 'Seleccione cliente',
                      },
                    }}
                  />
                )}
              />

              <TextField
                fullWidth
                label="Creado por"
                value={currentUserFullName}
                InputProps={{ readOnly: true }}
                helperText="Usuario responsable"
              />
            </Stack>

            {isEdit && isDatePostponed && (
              <Controller
                name="deliveryDateReason"
                control={control}
                rules={{ required: isDatePostponed ? 'Debe indicar la razón del cambio de fecha' : false }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={2}
                    label="Razón del cambio de fecha de entrega *"
                    placeholder="Explique por qué se está posponiendo la fecha de entrega..."
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message || 'Este campo es obligatorio cuando se pospone la fecha de entrega'}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'warning.lighter' } }}
                  />
                )}
              />
            )}

            <Controller
              name="commercialChannelId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Canal de Ventas *"
                  error={!!errors.commercialChannelId}
                  helperText={errors.commercialChannelId?.message || 'Canal por el cual se realizó la venta'}
                  disabled={!isClientSelected || channelsLoading}
                  InputProps={{
                    startAdornment: channelsLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null,
                  }}
                >
                  {channels.length > 0 ? (
                    channels.map((channel) => (
                      <MenuItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled value="">
                      No hay canales disponibles
                    </MenuItem>
                  )}
                </TextField>
              )}
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  // ── Image handlers ──────────────────────────────────────────────────────────

  const handleImageUpload = async (itemId: string, file: File) => {
    if (!isEdit) {
      const currentItems = getValues('items');
      const existingItem = currentItems.find(i => i.id === itemId);
      if (existingItem?.sampleImageId) {
        try { await storageApi.deleteFile(existingItem.sampleImageId); } catch { /* ignore */ }
      }
      try {
        const uploadedFile = await storageApi.uploadFile(file, { entityType: 'order' });
        setValue('items', currentItems.map((item) =>
          item.id === itemId ? { ...item, sampleImageId: uploadedFile.id } : item
        ));
        enqueueSnackbar('Imagen subida exitosamente', { variant: 'success' });
      } catch (error: any) {
        enqueueSnackbar(error.response?.data?.message || 'Error al subir la imagen', { variant: 'error' });
      }
      return;
    }

    const currentItem = orderQuery.data?.items?.find((item: any) => item.id === itemId);
    if (!currentItem) {
      enqueueSnackbar('Guarda los cambios antes de subir imágenes a ítems nuevos', { variant: 'warning' });
      return;
    }
    try {
      const uploadedFile = await ordersApi.uploadItemSampleImage(id!, itemId, file);
      const currentItems = getValues('items');
      setValue('items', currentItems.map((item) =>
        item.id === itemId ? { ...item, sampleImageId: uploadedFile.id } : item
      ));
      enqueueSnackbar('Imagen subida exitosamente', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Error al subir la imagen', { variant: 'error' });
    }
  };

  const handleImageDelete = async (itemId: string) => {
    if (!isEdit) {
      const currentItems = getValues('items');
      const item = currentItems.find(i => i.id === itemId);
      if (item?.sampleImageId) {
        try { await storageApi.deleteFile(item.sampleImageId); } catch { /* ignore */ }
      }
      setValue('items', currentItems.map((i) => i.id === itemId ? { ...i, sampleImageId: undefined } : i));
      enqueueSnackbar('Imagen eliminada', { variant: 'success' });
      return;
    }
    try {
      await ordersApi.deleteItemSampleImage(id!, itemId);
      const currentItems = getValues('items');
      setValue('items', currentItems.map((item) =>
        item.id === itemId ? { ...item, sampleImageId: undefined } : item
      ));
      enqueueSnackbar('Imagen eliminada exitosamente', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    } catch {
      enqueueSnackbar('Error al eliminar la imagen', { variant: 'error' });
    }
  };

  const renderStep1 = () => (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
            Ítems de la Orden
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={3}>
            {!isClientSelected && (
              <Typography variant="body2" color="text.secondary">
                Primero debe seleccionar un cliente para agregar ítems a la orden.
              </Typography>
            )}

            <Controller
              name="items"
              control={control}
              render={({ field }) => (
                <OrderItemsTable
                  items={field.value}
                  onChange={field.onChange}
                  errors={errors}
                  disabled={!isClientSelected}
                  orderId={isEdit ? id : undefined}
                  onImageUpload={handleImageUpload}
                  onImageDelete={handleImageDelete}
                />
              )}
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderStep2 = () => (
    <Stack spacing={3}>
      {/* Prueba de color */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
            Prueba de Color
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Controller
                name="requiresColorProof"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={!isClientSelected}
                        id="requiresColorProof"
                      />
                    }
                    label={
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        ¿Requiere prueba de color?
                      </Typography>
                    }
                  />
                )}
              />
            </Grid>
            {requiresColorProof && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="colorProofPrice"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Valor de la prueba de color"
                      size="small"
                      disabled={!isClientSelected}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                        inputProps: { inputMode: 'numeric' },
                      }}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw === '') { field.onChange(undefined); return; }
                        const val = parseInt(raw, 10);
                        field.onChange(isNaN(val) ? undefined : val);
                      }}
                      value={field.value !== undefined ? formatCurrencyInput(field.value.toString()) : ''}
                    />
                  )}
                />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Controller
        name="applyTax"
        control={control}
        render={({ field: applyTaxField }) => (
          <Controller
            name="taxRate"
            control={control}
            render={({ field: taxRateField }) => (
              <OrderTotals
                items={items}
                applyTax={applyTaxField.value}
                taxRate={taxRateField.value}
                requiresColorProof={requiresColorProof}
                colorProofPrice={colorProofPrice}
                onApplyTaxChange={applyTaxField.onChange}
                onTaxRateChange={taxRateField.onChange}
                disabled={!isClientSelected}
              />
            )}
          />
        )}
      />

      {saldoAFavor > 0 && total > 0 && (
        <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <FormControlLabel
              control={
                <Controller
                  name="useCreditBalance"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      {...field}
                      checked={field.value || false}
                      // Comentamos disabled={isEdit} para que en editar se pueda ver, o mejor, si isEdit, no dejar cambiar
                      disabled={isEdit}
                    />
                  )}
                />
              }
              label={
                <Typography variant="body1" fontWeight={600}>
                  Usar saldo a favor del cliente ({formatCurrency(saldoAFavor)})
                </Typography>
              }
            />
            {useCreditBalance && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                Se descontará automáticamente del total a pagar (aplica hasta {formatCurrency(Math.min(saldoAFavor, total))}).
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Controller
        name="payments"
        control={control}
        render={({ field: paymentsField }) => (
          <InitialPayment
            total={remainingTotalAfterCredit}
            enabled={true}
            values={paymentsField.value}
            onEnabledChange={() => {}}
            onChange={paymentsField.onChange}
            disabled={!isClientSelected}
            required={true}
            creditBalance={saldoAFavor}
          />
        )}
      />
    </Stack>
  );

  const renderStep3 = () => (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
            Observaciones y Confirmar
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                rows={4}
                label="Notas u Observaciones"
                placeholder="Agregue cualquier información adicional sobre esta orden..."
                helperText={
                  isClientSelected
                    ? 'Opcional: instrucciones especiales, detalles importantes, etc.'
                    : 'Primero seleccione un cliente'
                }
                disabled={!isClientSelected}
              />
            )}
          />
        </CardContent>
      </Card>

      {/* Resumen */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
            Resumen
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={0.5}>
            <Typography variant="body2">
              <strong>Cliente:</strong> {selectedClient?.name ?? '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Canal:</strong>{' '}
              {channels.find((c) => c.id === watch('commercialChannelId'))?.name ?? '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Ítems:</strong> {items.length}
            </Typography>
            <Typography variant="body2">
              <strong>Subtotal:</strong> {formatCurrency(subtotal)}
            </Typography>
            {applyTax && (
              <Typography variant="body2">
                <strong>IVA ({taxRate}%):</strong> {formatCurrency(tax)}
              </Typography>
            )}
            {requiresColorProof && (
              <Typography variant="body2">
                <strong>Prueba de color:</strong> {formatCurrency(colorProofPrice)}
              </Typography>
            )}
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="body2" fontWeight={700}>
              <strong>Total:</strong> {formatCurrency(total)}
            </Typography>
            <Divider sx={{ my: 0.5 }} />
            {useCreditBalance && creditBalanceUsed > 0 && (
              <Typography variant="body2" color="success.main" fontWeight={600}>
                <strong>Saldo a favor utilizado:</strong> - {formatCurrency(creditBalanceUsed)}
              </Typography>
            )}
            {watch('payments').map((p, i) => (
              <Typography key={i} variant="body2" color="primary.main" fontWeight={600}>
                <strong>Anticipo {watch('payments').length > 1 ? i + 1 : ''}:</strong>{' '}
                {formatCurrency(p.amount || 0)}{' '}
                <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
                  ({
                    { CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', CHECK: 'Cheque', CREDIT: 'Crédito', OTHER: 'Otro', CREDIT_BALANCE: 'Saldo a favor' }[p.paymentMethod] || p.paymentMethod
                  })
                </Typography>
              </Typography>
            ))}
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="body2" color="error.main" fontWeight={700}>
              <strong>Saldo por pagar:</strong>{' '}
              {formatCurrency(total - creditBalanceUsed - watch('payments').reduce((sum, p) => sum + (p.amount || 0), 0))}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {isSubmitting && (
        <LoadingSpinner fullScreen message={isEdit ? 'Guardando cambios...' : 'Creando orden...'} />
      )}

      <PageHeader
        title={isEdit ? 'Editar Orden' : 'Nueva Orden de Pedido'}
        breadcrumbs={[
          { label: 'Órdenes', path: '/orders' },
          { label: isEdit ? 'Editar' : 'Nueva' },
        ]}
      />

      {isEdit && id && <ActivePermissionBanner orderId={id} />}

      {/* ── PASOS TOP ── */}
      <Box
        sx={{
          position: 'relative',
          bgcolor: 'background.default',
          pt: 2,
          pb: 1,
          mb: 3,
          mx: { xs: -1, sm: -2, md: -3 }, // Para abarcar todo el margen
          px: { xs: 1, sm: 2, md: 3 },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)' },
          }}
        >
          {STEPS.map((step, i) => (
            <Box key={i} sx={{ minWidth: { xs: 240, md: 0 }, flex: { md: 1 } }}>
              <StepHeader
                index={i}
                config={step}
                status={getStepStatus(i)}
                clickable={visitedSteps.has(i) && i !== activeStep}
                onClick={() => goToStep(i)}
              />
            </Box>
          ))}
        </Stack>
      </Box>

      <Box sx={{ maxWidth: '100%' }}>
          {/* ── Contenido del paso activo ── */}
          <Box flex={1}>
            {activeStep === 0 && renderStep0()}
            {activeStep === 1 && renderStep1()}
            {activeStep === 2 && renderStep2()}
            {activeStep === 3 && renderStep3()}

            {/* Navegación */}
            <Stack
              direction={{ xs: 'column-reverse', sm: 'row' }}
              justifyContent="space-between"
              spacing={{ xs: 1, sm: 0 }}
              sx={{ mt: 4 }}
            >
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() =>
                  activeStep === 0 ? navigate('/orders') : goToStep(activeStep - 1)
                }
                disabled={isSubmitting}
                fullWidth={false}
              >
                {activeStep === 0 ? 'Cancelar' : 'Anterior'}
              </Button>

              {activeStep < STEPS.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={() => goToStep(activeStep + 1)}
                  disabled={!canGoNext() || isSubmitting}
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<SaveIcon />}
                  disabled={isSubmitting || !isValid}
                  onClick={handleSubmit(onSubmit)}
                >
                  {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Orden'}
                </Button>
              )}
            </Stack>
          </Box>
      </Box>
    </Box>
  );
};

export default OrderFormPage;
