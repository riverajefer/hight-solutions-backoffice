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
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
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
import {
  ClientSelector,
  OrderItemsTable,
  OrderTotals,
  InitialPayment,
} from '../components';
import type { Client } from '../../../types/client.types';
import type { CreateOrderDto } from '../../../types/order.types';
import { useAuthStore } from '../../../store/authStore';

// ============================================================
// VALIDATION SCHEMA
// ============================================================

const orderItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'La descripción es requerida'),
  quantity: z.string().min(1, 'La cantidad es requerida'),
  unitPrice: z.string().min(1, 'El precio unitario es requerido'),
  total: z.number().min(0),
  serviceId: z.string().optional(),
  specifications: z.record(z.any()).optional(),
});

const initialPaymentSchema = z.object({
  amount: z.number().positive('El monto del abono inicial es requerido'),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'CARD', 'CHECK', 'OTHER']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const orderFormSchema = z
  .object({
    client: z.custom<Client | null>((val) => val !== null, {
      message: 'Debe seleccionar un cliente',
    }).nullable(),
    deliveryDate: z.date().nullable(),
    notes: z.string().optional(),
    items: z.array(orderItemSchema).min(1, 'Debe agregar al menos un item'),
    applyTax: z.boolean(),
    taxRate: z.number().min(0).max(100),
    payment: initialPaymentSchema, // Abono inicial es obligatorio
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
      const total = subtotal + tax;
      return data.payment.amount <= total;
    },
    {
      message: 'El monto del abono no puede ser mayor al total de la orden',
      path: ['payment', 'amount'],
    }
  );

type OrderFormData = z.infer<typeof orderFormSchema>;

// ============================================================
// COMPONENT
// ============================================================

export const OrderFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const isEdit = !!id;
  const { orderQuery } = useOrder(id || '');
  const { createOrderMutation } = useOrders();

  const [isSubmitting, setIsSubmitting] = useState(false);

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
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      client: null,
      deliveryDate: null,
      notes: '',
      items: [
        {
          id: uuidv4(),
          description: '',
          quantity: '',
          unitPrice: '',
          total: 0,
        },
      ],
      applyTax: true,
      taxRate: 19,
      payment: {
        amount: 0,
        paymentMethod: 'CASH',
        reference: '',
        notes: '',
      },
    },
  });

  // Watch values for calculations and conditional logic
  const selectedClient = watch('client');
  const items = watch('items');
  const applyTax = watch('applyTax');
  const taxRate = watch('taxRate');
  const payment = watch('payment');

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = applyTax ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax;

  // Deshabilitar campos si no hay cliente seleccionado
  const isClientSelected = !!selectedClient;

  // Actualizar IVA automáticamente según tipo de cliente
  useEffect(() => {
    if (selectedClient) {
      // Si es empresa, aplicar IVA; si es natural, no aplicar
      const shouldApplyTax = selectedClient.personType === 'EMPRESA';
      setValue('applyTax', shouldApplyTax);
    }
  }, [selectedClient, setValue]);

  // Load order data for edit mode
  useEffect(() => {
    if (isEdit && orderQuery.data) {
      const order = orderQuery.data;

      // Can only edit DRAFT orders
      if (order.status !== 'DRAFT') {
        navigate(`/orders/${id}`);
        return;
      }

      // Populate form with existing data
      setValue('client', order.client as any);
      setValue('deliveryDate', order.deliveryDate ? new Date(order.deliveryDate) : null);
      setValue('notes', order.notes || '');
      setValue(
        'items',
        order.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice,
          total: parseFloat(item.total),
          serviceId: item.service?.id,
          specifications: item.specifications || undefined,
        }))
      );
      setValue('applyTax', parseFloat(order.taxRate) > 0);
      setValue('taxRate', parseFloat(order.taxRate) * 100);
    }
  }, [isEdit, orderQuery.data, id, navigate, setValue]);

  // Handle form submission
  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);

    try {
      const createDto: CreateOrderDto = {
        clientId: data.client!.id,
        deliveryDate: data.deliveryDate?.toISOString(),
        notes: data.notes,
        items: data.items.map((item) => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          serviceId: item.serviceId,
          specifications: item.specifications,
        })),
        initialPayment: {
          amount: data.payment.amount,
          paymentMethod: data.payment.paymentMethod,
          reference: data.payment.reference,
          notes: data.payment.notes,
        },
      };

      const newOrder = await createOrderMutation.mutateAsync(createDto);
      navigate(`/orders/${newOrder.id}`);
    } catch (error) {
      // Error handled by mutation hook
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isEdit && orderQuery.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={isEdit ? 'Editar Orden' : 'Nueva Orden de Pedido'}
        breadcrumbs={[
          { label: 'Órdenes', path: '/orders' },
          { label: isEdit ? 'Editar' : 'Nueva' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3} sx={{ mt: 3 }}>
          {/* Sección 1: Cliente */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                1. Cliente
              </Typography>
              <Divider sx={{ mb: 2 }} />
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
            </CardContent>
          </Card>

          {/* Sección 2: Fechas */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                2. Fechas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {/* Fecha de Orden (readonly) */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Fecha de Orden"
                    value={new Date().toLocaleDateString('es-CO')}
                    disabled={!isClientSelected}
                    InputProps={{
                      readOnly: true,
                    }}
                    helperText="Se registrará automáticamente al crear la orden"
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
                            helperText: isClientSelected
                              ? 'Fecha estimada de entrega al cliente'
                              : 'Primero seleccione un cliente',
                          },
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Creado por (readonly) */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Creado por"
                    value={currentUserFullName}
                    InputProps={{
                      readOnly: true,
                    }}
                    helperText="Usuario que crea la orden"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Sección 3: Items */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                3. Items de la Orden
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

          {/* Sección 6: Notas */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                6. Observaciones
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
                startIcon={<CancelIcon />}
                onClick={() => navigate('/orders')}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={isSubmitting}
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
