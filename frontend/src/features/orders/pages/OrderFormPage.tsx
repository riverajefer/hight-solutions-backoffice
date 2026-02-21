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
  Paper,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { commercialChannelsApi } from '../../../api/commercialChannels.api';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DatePicker } from '@mui/x-date-pickers';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
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
      // Si es crédito, el monto puede ser 0
      if (data.paymentMethod === 'CREDIT') {
        return data.amount >= 0;
      }
      // En otros casos debe ser mayor a 0 (como estaba antes con .positive())
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
      // Validar que todos los items tengan valores válidos
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
      // Validar que el monto del abono no exceda el total
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
    () => {
      // En modo edición, no validamos aquí porque la validación se hace dinámicamente
      // en el componente con react-hook-form rules
      return true;
    },
    {
      message: 'Debe indicar la razón del cambio de fecha',
      path: ['deliveryDateReason'],
    }
  );

type OrderFormData = z.infer<typeof orderFormSchema>;

// Formatea moneda mientras se escribe (similar al valor unitario)
const formatCurrencyInput = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  const number = parseInt(numericValue, 10);
  return new Intl.NumberFormat('es-CO').format(number);
};

// ============================================================
// COMPONENT
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

  // Cargar canales de venta
  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['commercial-channels'],
    queryFn: () => commercialChannelsApi.getAll(),
  });

  // Nombre completo del usuario en sesión
  const currentUserFullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    : '';

  // React Hook Form
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

  // Watch values for calculations and conditional logic
  const selectedClient = watch('client');
  const items = watch('items');
  const applyTax = watch('applyTax');
  const taxRate = watch('taxRate');
  const deliveryDate = watch('deliveryDate');
  const requiresColorProof = watch('requiresColorProof');
  const colorProofPrice = requiresColorProof ? watch('colorProofPrice') || 0 : 0;

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = applyTax ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax + colorProofPrice;

  // Deshabilitar campos si no hay cliente seleccionado
  const isClientSelected = !!selectedClient;

  // Detectar si se está posponiendo la fecha de entrega
  const [isDatePostponed, setIsDatePostponed] = useState(false);
  const [originalDeliveryDate, setOriginalDeliveryDate] = useState<Date | null>(null);

  useEffect(() => {
    if (isEdit && orderQuery.data && deliveryDate) {
      const currentDate = orderQuery.data.deliveryDate ? new Date(orderQuery.data.deliveryDate) : null;
      const newDate = deliveryDate;

      // Guardar la fecha original cuando se carga la orden
      if (currentDate && !originalDeliveryDate) {
        setOriginalDeliveryDate(currentDate);
      }

      // Comparar con la fecha original guardada
      if (originalDeliveryDate && newDate > originalDeliveryDate) {
        setIsDatePostponed(true);
      } else {
        setIsDatePostponed(false);
        // Limpiar la razón si no es posposición
        setValue('deliveryDateReason', '');
      }
    }
  }, [deliveryDate, isEdit, orderQuery.data, originalDeliveryDate, setValue]);

  // Actualizar IVA automáticamente según tipo de cliente (solo en modo creación)
  useEffect(() => {
    if (!isEdit && selectedClient) {
      // Si es empresa, aplicar IVA; si es natural, no aplicar
      const shouldApplyTax = selectedClient.personType === 'EMPRESA';
      setValue('applyTax', shouldApplyTax);
    }
  }, [selectedClient, setValue, isEdit]);

  // Load order data for edit mode
  useEffect(() => {
    if (isEdit && orderQuery.data) {
      const order = orderQuery.data;

      // Validar acceso a edición
      const canEdit =
        order.status === 'DRAFT' ||           // DRAFT siempre editable
        isAdmin ||                             // Admin puede editar todo
        activePermissionQuery.data !== null;   // Permiso temporal activo

      if (!canEdit) {
        enqueueSnackbar('No tienes permiso para editar esta orden', {
          variant: 'error'
        });
        navigate(`/orders/${id}`);
        return;
      }

      // Populate form with existing data
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

      // Cargar abono inicial (primer pago si existe)
      const firstPayment = order.payments && order.payments.length > 0 ? order.payments[0] : null;
      setValue('payment', {
        amount: firstPayment ? parseFloat(firstPayment.amount) : 0,
        paymentMethod: firstPayment?.paymentMethod || 'CASH',
        reference: firstPayment?.reference || '',
        notes: firstPayment?.notes || '',
      });
      setValue('commercialChannelId', order.commercialChannelId || '');
    }
  }, [isEdit, orderQuery.data, id, navigate, setValue, isAdmin, activePermissionQuery.data]);

  // Handle form submission
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
        // Actualizar orden existente
        await updateOrderMutation.mutateAsync(orderDto);
        navigate(`/orders/${id}`);
      } else {
        // Crear nueva orden
        const newOrder = await createOrderMutation.mutateAsync(orderDto);
        navigate(`/orders/${newOrder.id}`);
      }
    } catch (error: any) {
      // Manejo especial para error 403 (permiso expirado)
      if (error?.response?.status === 403) {
        enqueueSnackbar(
          'Tu permiso de edición ha expirado. Solicita un nuevo permiso.',
          { variant: 'error' }
        );
        navigate(`/orders/${id}`);
      } else {
        // Otros errores manejados por mutation hook
        setIsSubmitting(false);
      }
    }
  };

  // Loading state
  if (isEdit && orderQuery.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {isSubmitting && (
        <LoadingSpinner 
          fullScreen 
          message={isEdit ? 'Guardando cambios...' : 'Creando orden...'} 
        />
      )}
      <PageHeader
        title={isEdit ? 'Editar Orden' : 'Nueva Orden de Pedido'}
        breadcrumbs={[
          { label: 'Órdenes', path: '/orders' },
          { label: isEdit ? 'Editar' : 'Nueva' },
        ]}
      />

      {/* Banner de permiso activo */}
      {isEdit && id && <ActivePermissionBanner orderId={id} />}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3} sx={{ mt: 3 }}>
          {/* Sección 1: Información del Cliente y Fechas */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
                1. Información del Cliente y Fechas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
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
                </Grid>

                {/* Fecha de Orden (readonly) */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Fecha de Orden"
                    size="small"
                    value={new Date().toLocaleDateString('es-CO')}
                    disabled={!isClientSelected}
                    InputProps={{
                      readOnly: true,
                    }}
                    helperText="Fecha de registro"
                  />
                </Grid>

                {/* Fecha de Entrega */}
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
                            helperText: isClientSelected
                              ? 'Fecha estimada'
                              : 'Seleccione cliente',
                          },
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Razón del cambio de fecha (solo si se pospone) */}
                {isEdit && isDatePostponed && (
                  <Grid item xs={12}>
                    <Controller
                      name="deliveryDateReason"
                      control={control}
                      rules={{
                        required: isDatePostponed ? 'Debe indicar la razón del cambio de fecha' : false,
                      }}
                      render={({ field, fieldState }) => (
                        <TextField
                          {...field}
                          fullWidth
                          multiline
                          rows={2}
                          label="Razón del cambio de fecha de entrega *"
                          placeholder="Explique por qué se está posponiendo la fecha de entrega..."
                          error={!!fieldState.error}
                          helperText={
                            fieldState.error?.message ||
                            'Este campo es obligatorio cuando se pospone la fecha de entrega'
                          }
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'warning.lighter',
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>
                )}

                {/* Creado por (readonly) */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Creado por"
                    size="small"
                    value={currentUserFullName}
                    InputProps={{
                      readOnly: true,
                    }}
                    helperText="Usuario responsable"
                  />
                </Grid>

              </Grid>
            </CardContent>
          </Card>

          {/* Sección 3: Items */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
                2. Items de la Orden
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {!isClientSelected && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Primero debe seleccionar un cliente para agregar items a la orden.
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
            </CardContent>
          </Card>

          {/* Sección 4: Totales */}
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

          {/* Sección 5: Abono Inicial (Obligatorio) */}
          <Controller
            name="payment"
            control={control}
            render={({ field: paymentField }) => (
              <InitialPayment
                total={total}
                enabled={true}
                value={paymentField.value}
                onEnabledChange={() => {}} // No permitir deshabilitar
                onChange={paymentField.onChange}
                errors={errors as any}
                disabled={!isClientSelected}
                required={true}
              />
            )}
          />

          {/* Sección 5: Canal de Ventas */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
                5. Canal de Ventas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Controller
                name="commercialChannelId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Seleccione el Canal de Venta"
                    error={!!errors.commercialChannelId}
                    helperText={errors.commercialChannelId?.message || 'Canal por el cual se realizó la venta'}
                    disabled={!isClientSelected || channelsLoading}
                    InputProps={{
                      startAdornment: channelsLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null
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
            </CardContent>
          </Card>

          {/* Sección 6: Prueba de Color */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
                6. Prueba de Color
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="requiresColorProof"
                    control={control}
                    render={({ field }) => (
                      <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
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
                            inputProps: {
                              inputMode: 'numeric',
                            },
                          }}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            if (raw === '') {
                              field.onChange(undefined);
                              return;
                            }
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

          {/* Sección 7: Notas */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
                7. Observaciones
              </Typography>
              <Divider sx={{ mb: 2 }} />
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

          {/* Acciones */}
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => navigate('/orders')}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="success"
                startIcon={<SaveIcon />}
                disabled={isSubmitting || !isValid}
              >
                {isSubmitting
                  ? 'Guardando...'
                  : isEdit
                  ? 'Guardar Cambios'
                  : 'Crear Orden'}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </form>
    </Box>
  );
};

export default OrderFormPage;
