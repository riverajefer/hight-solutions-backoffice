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
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { commercialChannelsApi } from '../../../api/commercialChannels.api';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DatePicker } from '@mui/x-date-pickers';
import { v4 as uuidv4 } from 'uuid';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useQuotes } from '../hooks/useQuotes';
import { ClientSelector } from '../../orders/components/ClientSelector';
import { QuoteItemsTable } from '../components/QuoteItemsTable';
import { OrderTotals } from '../../orders/components/OrderTotals';
import type { Client } from '../../../types/client.types';

const quoteItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'La descripción es requerida'),
  quantity: z.string().min(1, 'La cantidad es requerida'),
  unitPrice: z.string().min(1, 'El precio unitario es requerido'),
  total: z.number().min(0),
  serviceId: z.string().optional(),
  specifications: z.record(z.any()).optional(),
  productionAreaIds: z.array(z.string()).optional(),
});

const quoteFormSchema = z.object({
  client: z.custom<Client | null>((val) => val !== null, {
    message: 'Debe seleccionar un cliente',
  }).nullable(),
  validUntil: z.date().nullable(),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'Debe agregar al menos un item'),
  applyTax: z.boolean(),
  taxRate: z.number().min(0).max(100),
  commercialChannelId: z.string().min(1, 'El canal de ventas es requerido'),
}).refine(
  (data) => data.items.every((item) => {
    const qty = parseFloat(item.quantity);
    const price = parseFloat(item.unitPrice);
    return !isNaN(qty) && qty > 0 && !isNaN(price) && price >= 0;
  }),
  { message: 'Todos los items deben tener cantidad y precio válidos', path: ['items'] }
);

type QuoteFormData = z.infer<typeof quoteFormSchema>;

export const QuoteFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { quoteQuery, createQuoteMutation, updateQuoteMutation } = useQuotes();
  const currentQuote = isEdit ? quoteQuery(id!).data : null;
  const isLoadingQuote = isEdit && quoteQuery(id!).isLoading;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['commercial-channels'],
    queryFn: () => commercialChannelsApi.getAll(),
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    mode: 'onChange',
    defaultValues: {
      client: null,
      validUntil: null,
      notes: '',
      items: [{ id: uuidv4(), description: '', quantity: '', unitPrice: '', total: 0, productionAreaIds: [] }],
      applyTax: false,
      taxRate: 19,
      commercialChannelId: '',
    },
  });

  const selectedClient = watch('client');
  const items = watch('items');
  const applyTax = watch('applyTax');
  const taxRate = watch('taxRate');
  const isClientSelected = !!selectedClient;

  useEffect(() => {
    if (!isEdit && selectedClient) {
      setValue('applyTax', selectedClient.personType === 'EMPRESA');
    }
  }, [selectedClient, setValue, isEdit]);

  useEffect(() => {
    if (isEdit && currentQuote) {
      setValue('client', currentQuote.client as any);
      setValue('validUntil', currentQuote.validUntil ? new Date(currentQuote.validUntil) : null);
      setValue('notes', currentQuote.notes || '');
      setValue('items', currentQuote.items?.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        total: parseFloat(item.total.toString()),
        serviceId: item.serviceId,
        specifications: item.specifications || undefined,
        productionAreaIds: item.productionAreas
          ? item.productionAreas.map((pa: any) => pa.productionArea.id)
          : [],
      })) || []);
      setValue('applyTax', parseFloat(currentQuote.taxRate.toString()) > 0);
      setValue('taxRate', parseFloat(currentQuote.taxRate.toString()) * 100);
      setValue('commercialChannelId', currentQuote.commercialChannelId || '');
    }
  }, [isEdit, currentQuote, setValue]);

  const onSubmit = async (data: QuoteFormData) => {
    setIsSubmitting(true);
    try {
      const quoteDto = {
        clientId: data.client!.id,
        validUntil: data.validUntil?.toISOString(),
        notes: data.notes,
        items: data.items.map((item) => ({
          ...(isEdit && { id: item.id }),
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          serviceId: item.serviceId,
          specifications: item.specifications,
          productionAreaIds: item.productionAreaIds,
        })),
        commercialChannelId: data.commercialChannelId,
      };

      if (isEdit) {
        await updateQuoteMutation.mutateAsync({ id: id!, data: quoteDto });
      } else {
        await createQuoteMutation.mutateAsync(quoteDto);
      }
      navigate('/quotes');
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  if (isLoadingQuote) return <LoadingSpinner />;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={isEdit ? 'Editar Cotización' : 'Nueva Cotización'}
        breadcrumbs={[
          { label: 'Cotizaciones', path: '/quotes' },
          { label: isEdit ? 'Editar' : 'Nueva' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3} sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">1. Información General</Typography>
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
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="validUntil"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label="Válida hasta"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={!isClientSelected}
                        minDate={new Date()}
                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="commercialChannelId"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        fullWidth
                        label="Canal de Venta"
                        size="small"
                        error={!!errors.commercialChannelId}
                        disabled={!isClientSelected || channelsLoading}
                      >
                        {channels.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                      </TextField>
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">2. Ítems</Typography>
              <Divider sx={{ mb: 2 }} />
              <Controller
                name="items"
                control={control}
                render={({ field }) => (
                  <QuoteItemsTable
                    items={field.value}
                    onChange={field.onChange}
                    errors={errors}
                    disabled={!isClientSelected}
                  />
                )}
              />
            </CardContent>
          </Card>

          <OrderTotals
            items={items as any}
            applyTax={applyTax}
            taxRate={taxRate}
            onApplyTaxChange={(val: boolean) => setValue('applyTax', val)}
            onTaxRateChange={(val: number) => setValue('taxRate', val)}
            disabled={!isClientSelected}
          />

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">3. Observaciones</Typography>
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
                    label="Notas"
                    disabled={!isClientSelected}
                  />
                )}
              />
            </CardContent>
          </Card>

          <Paper sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" color="error" onClick={() => navigate('/quotes')}>Cancelar</Button>
              <Button type="submit" variant="contained" color="success" disabled={isSubmitting || !isValid}>
                {isSubmitting ? 'Guardando...' : 'Guardar Cotización'}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </form>
    </Box>
  );
};

export default QuoteFormPage;
