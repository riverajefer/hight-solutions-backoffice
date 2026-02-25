import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
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
import { DatePicker } from '@mui/x-date-pickers';
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
  productionAreaIds: z.array(z.string()),
});

const initialPaymentSchema = z
  .object({
    amount: z.number().min(0, 'El monto del abono inicial no puede ser negativo'),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CARD', 'CHECK', 'CREDIT', 'OTHER']),
    reference: z.string().optional(),
    notes: z.string().optional(),
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
    payment: initialPaymentSchema,
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
      return data.payment.amount <= total;
    },
    {
      message: 'El monto del abono no puede ser mayor al total de la orden',
      path: ['payment', 'amount'],
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
      payment: {
        amount: 0,
        paymentMethod: 'CASH',
        reference: '',
        notes: '',
      },
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

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = applyTax ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax + colorProofPrice;

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
          productionAreaIds: item.productionAreas
            ? item.productionAreas.map((pa) => pa.productionArea.id)
            : [],
        }))
      );
      setValue('applyTax', parseFloat(order.taxRate) > 0);
      setValue('taxRate', parseFloat(order.taxRate) * 100);

      const firstPayment = order.payments && order.payments.length > 0 ? order.payments[0] : null;
      setValue('payment', {
        amount: firstPayment ? parseFloat(firstPayment.amount) : 0,
        paymentMethod: firstPayment?.paymentMethod || 'CASH',
        reference: firstPayment?.reference || '',
        notes: firstPayment?.notes || '',
      });
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

  const getStepStatus = (i: number): 'active' | 'completed' | 'visited' | 'pending' => {
    if (i === activeStep) return 'active';
    if (!visitedSteps.has(i)) return 'pending';
    // Validación básica por paso
    const validByStep = [
      isClientSelected,               // paso 0: cliente seleccionado
      items.length > 0 && items.every((item) => item.description && item.quantity && item.unitPrice), // paso 1
      true,                           // paso 2: totales/pago — siempre válido para avanzar
      true,                           // paso 3
    ];
    return validByStep[i] ? 'completed' : 'visited';
  };

  const canGoNext = () => {
    if (activeStep === 0) return isClientSelected;
    if (activeStep === 1) return items.length > 0;
    return true;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const onSubmit: SubmitHandler<OrderFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const orderDto = {
        clientId: data.client!.id,
        deliveryDate: data.deliveryDate?.toISOString(),
        ...(isEdit && isDatePostponed && data.deliveryDateReason && {
          deliveryDateReason: data.deliveryDateReason,
        }),
        notes: data.notes,
        requiresColorProof: data.requiresColorProof,
        colorProofPrice: data.requiresColorProof ? data.colorProofPrice : 0,
        items: data.items.map((item) => ({
          ...(isEdit && item.id && { id: item.id }),
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          productId: item.productId,
          specifications: item.specifications,
          productionAreaIds: item.productionAreaIds,
        })),
        initialPayment: {
          amount: data.payment.amount,
          paymentMethod: data.payment.paymentMethod,
          reference: data.payment.reference,
          notes: data.payment.notes,
        },
        commercialChannelId: data.commercialChannelId,
      };

      if (isEdit) {
        await updateOrderMutation.mutateAsync(orderDto);
        navigate(`/orders/${id}`);
      } else {
        const newOrder = await createOrderMutation.mutateAsync(orderDto);
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
      <Typography variant="h6" fontWeight={600}>
        Cliente y Fechas
      </Typography>

      <Controller
        name="client"
        control={control}
        render={({ field }) => (
          <ClientSelector
            value={field.value}
            onChange={field.onChange}
            error={!!errors.client}
            helperText={errors.client?.message}
          />
        )}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Fecha de Orden"
            size="small"
            value={new Date().toLocaleDateString('es-CO')}
            disabled={!isClientSelected}
            InputProps={{ readOnly: true }}
            helperText="Fecha de registro"
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="deliveryDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Fecha de Entrega (Opcional)"
                value={field.value}
                onChange={field.onChange}
                disabled={!isClientSelected}
                minDate={new Date()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    helperText: isClientSelected ? 'Fecha estimada' : 'Seleccione cliente',
                  },
                }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Creado por"
            size="small"
            value={currentUserFullName}
            InputProps={{ readOnly: true }}
            helperText="Usuario responsable"
          />
        </Grid>
      </Grid>

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
  );

  const renderStep1 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Ítems de la Orden
      </Typography>

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
          />
        )}
      />
    </Stack>
  );

  const renderStep2 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Totales y Pago Inicial
      </Typography>

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

      {/* Prueba de color */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Prueba de Color
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Controller
                name="requiresColorProof"
                control={control}
                render={({ field }) => (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      id="requiresColorProof"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={!isClientSelected}
                      style={{ marginRight: '8px', width: '18px', height: '18px' }}
                    />
                    <label htmlFor="requiresColorProof" style={{ cursor: 'pointer', userSelect: 'none' }}>
                      ¿Requiere prueba de color?
                    </label>
                  </Box>
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
        name="payment"
        control={control}
        render={({ field: paymentField }) => (
          <InitialPayment
            total={total}
            enabled={true}
            value={paymentField.value}
            onEnabledChange={() => {}}
            onChange={paymentField.onChange}
            errors={errors as any}
            disabled={!isClientSelected}
            required={true}
          />
        )}
      />
    </Stack>
  );

  const renderStep3 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Observaciones y Confirmar
      </Typography>

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

      {/* Resumen */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
            RESUMEN
          </Typography>
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
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box>
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

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mt: 2 }}>
          {/* ── Sidebar de pasos ── */}
          <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
            <Stack spacing={1}>
              {STEPS.map((step, i) => (
                <StepHeader
                  key={i}
                  index={i}
                  config={step}
                  status={getStepStatus(i)}
                  clickable={visitedSteps.has(i) && i !== activeStep}
                  onClick={() => goToStep(i)}
                />
              ))}
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* ── Contenido del paso activo ── */}
          <Box flex={1}>
            {activeStep === 0 && renderStep0()}
            {activeStep === 1 && renderStep1()}
            {activeStep === 2 && renderStep2()}
            {activeStep === 3 && renderStep3()}

            {/* Navegación */}
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() =>
                  activeStep === 0 ? navigate('/orders') : goToStep(activeStep - 1)
                }
                disabled={isSubmitting}
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
        </Stack>
    </Box>
  );
};

export default OrderFormPage;
