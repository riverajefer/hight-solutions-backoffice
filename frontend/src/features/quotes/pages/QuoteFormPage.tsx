import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Typography,
  Divider,
  MenuItem,
  alpha,
  useTheme,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { commercialChannelsApi } from '../../../api/commercialChannels.api';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DatePicker } from '@mui/x-date-pickers';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as AttachMoneyIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useQuotes } from '../hooks/useQuotes';
import { ClientSelector } from '../../orders/components/ClientSelector';
import { QuoteItemsTable } from '../components/QuoteItemsTable';
import { OrderTotals } from '../../orders/components/OrderTotals';
import type { Client } from '../../../types/client.types';
import { quotesApi } from '../../../api/quotes.api';
import { storageApi } from '../../../api/storage.api';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '../../../store/authStore';

// ============================================================
// VALIDATION SCHEMA
// ============================================================

const quoteItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'La descripción es requerida'),
  quantity: z.string().min(1, 'La cantidad es requerida'),
  unitPrice: z.string().min(1, 'El precio unitario es requerido'),
  total: z.number().min(0),
  productId: z.string().optional(),
  specifications: z.record(z.any()).optional(),
  sampleImageId: z.string().nullable().optional(),
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
  taxRate: z.number().min(0),
  commercialChannelId: z.string().min(1, 'El canal de ventas es requerido'),
}).refine(
  (data) => {
    // If we have items, check they are valid strings
    if (!data.items || data.items.length === 0) return false;
    
    return data.items.every((item) => {
      const qty = parseFloat(item.quantity?.toString());
      const price = parseFloat(item.unitPrice?.toString());
      return !isNaN(qty) && qty > 0 && !isNaN(price) && price >= 0;
    });
  },
  { message: 'Todos los items deben tener cantidad y precio válidos', path: ['items'] }
);

type QuoteFormData = z.infer<typeof quoteFormSchema>;

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
  { label: 'Cliente e Info General', subtitle: 'Datos del cliente y canal de ventas', icon: <PersonIcon fontSize="small" /> },
  { label: 'Ítems', subtitle: 'Productos y cantidades', icon: <ShoppingCartIcon fontSize="small" /> },
  { label: 'Totales e IVA', subtitle: 'Cálculo de impuestos y totales', icon: <AttachMoneyIcon fontSize="small" /> },
  { label: 'Observaciones y Confirmar', subtitle: 'Notas finales y guardar', icon: <NotesIcon fontSize="small" /> },
];

// ============================================================
// STEP HEADER COMPONENT
// ============================================================

interface StepHeaderProps {
  index: number;
  config: StepConfig;
  status: 'active' | 'completed' | 'visited' | 'pending';
  compact?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

const StepHeader: React.FC<StepHeaderProps> = ({ index, config, status, compact = false, clickable, onClick }) => {
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
        gap: compact ? 1.25 : 1.5,
        p: compact ? 1.5 : 2,
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
            width: compact ? 30 : 32,
            height: compact ? 30 : 32,
            borderRadius: '50%',
            bgcolor: numberBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: compact ? 13 : 14,
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
        <Typography variant="subtitle2" fontWeight={600} sx={{ color: labelColor, fontSize: compact ? '0.95rem' : undefined }}>
          {config.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: compact ? '0.78rem' : undefined }}>
          {config.subtitle}
        </Typography>
      </Box>
    </Box>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const QuoteFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role?.name === 'admin';

  const { quoteQuery, createQuoteMutation, updateQuoteMutation } = useQuotes();
  const currentQuote = isEdit ? quoteQuery(id!).data : null;
  const isLoadingQuote = isEdit && quoteQuery(id!).isLoading;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['commercial-channels'],
    queryFn: () => commercialChannelsApi.getAll(),
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
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

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Validation Errors:', errors);
      console.log('Current Values:', getValues());
    }
  }, [errors, getValues]);

  const selectedClient = watch('client');
  const items = watch('items');
  const applyTax = watch('applyTax');
  const taxRate = watch('taxRate');
  const commercialChannelId = watch('commercialChannelId');
  const isClientSelected = !!selectedClient;

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total?.toString() || '0')), 0);
  const tax = applyTax ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax;

  // Auto-apply tax based on client type
  useEffect(() => {
    if (!isEdit && selectedClient) {
      setValue('applyTax', selectedClient.personType === 'EMPRESA');
    }
  }, [selectedClient, setValue, isEdit]);

  // Load edit data
  useEffect(() => {
    if (isEdit && currentQuote) {
      setValue('client', currentQuote.client as any, { shouldValidate: true });
      setValue('validUntil', currentQuote.validUntil ? new Date(currentQuote.validUntil) : null, { shouldValidate: true });
      setValue('notes', currentQuote.notes || '', { shouldValidate: true });
      if (currentQuote.items && currentQuote.items.length > 0) {
        setValue('items', currentQuote.items.map((item: any) => ({
          id: item.id,
          description: item.description || '',
          quantity: item.quantity?.toString() || '1',
          unitPrice: item.unitPrice?.toString() || '0',
          total: parseFloat(item.total?.toString() || '0'),
          productId: item.productId,
          specifications: item.specifications || undefined,
          sampleImageId: item.sampleImageId,
          productionAreaIds: item.productionAreas
            ? item.productionAreas.map((pa: any) => pa.productionArea.id)
            : [],
        })), { shouldValidate: true });
      }
      
      const taxRateValue = parseFloat(currentQuote.taxRate?.toString() || '0');
      setValue('applyTax', taxRateValue > 0, { shouldValidate: true });
      // If the DB has 0.19, multiplying by 100 gives 19. If it already has 19, it gives 1900.
      // Most of our backend logic seems to use 0.19 as default but Prisma.Decimal might return it differently.
      const displayTaxRate = taxRateValue <= 1 ? taxRateValue * 100 : taxRateValue;
      setValue('taxRate', displayTaxRate, { shouldValidate: true });
      setValue('commercialChannelId', currentQuote.commercialChannelId || '', { shouldValidate: true });
      // En edición todos los pasos ya fueron completados
      setVisitedSteps(new Set([0, 1, 2, 3]));
      
      // Force manual validation trigger after a small delay to ensure values are set
      setTimeout(() => {
        trigger();
      }, 500);
    }
  }, [isEdit, currentQuote, setValue, trigger]);

  // ── Step navigation ──────────────────────────────────────────────────────────

  const goToStep = (step: number) => {
    setActiveStep(step);
    setVisitedSteps((prev) => new Set([...prev, step]));
  };

  const hasValidItems = items.length > 0 && items.some((item) => item.description && item.quantity && item.unitPrice);

  const getStepStatus = (i: number): 'active' | 'completed' | 'visited' | 'pending' => {
    if (i === activeStep) return 'active';
    if (!visitedSteps.has(i)) return 'pending';
    const validByStep = [
      isClientSelected && !!commercialChannelId,  // paso 0: cliente + canal de ventas
      hasValidItems,     // paso 1: al menos un item completo
      hasValidItems,     // paso 2: requiere items para tener sentido
      true,              // paso 3
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

  const onSubmit = async (data: QuoteFormData) => {
    setIsSubmitting(true);
    try {
      const quoteDto = {
        clientId: data.client!.id,
        validUntil: data.validUntil?.toISOString(),
        notes: data.notes,
        taxRate: data.applyTax ? data.taxRate / 100 : 0,
        items: data.items.map((item) => ({
          ...(isEdit && { id: item.id }),
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          productId: item.productId,
          specifications: item.specifications,
          sampleImageId: item.sampleImageId ?? undefined,
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

  // ── Image handlers ────────────────────────────────────────────────────────────

  const handleImageUpload = async (itemId: string, file: File) => {
    if (!isEdit) {
      const currentItems = getValues('items');
      const existingItem = currentItems.find(i => i.id === itemId);
      if (existingItem?.sampleImageId) {
        try { await storageApi.deleteFile(existingItem.sampleImageId); } catch (err) { /* ignore */ }
      }
      try {
        const uploadedFile = await storageApi.uploadFile(file, { entityType: 'quote' });
        setValue('items', currentItems.map((item) =>
          item.id === itemId ? { ...item, sampleImageId: uploadedFile.id } : item
        ));
        enqueueSnackbar('Imagen subida exitosamente', { variant: 'success' });
      } catch (error: any) {
        enqueueSnackbar(error.response?.data?.message || 'Error al subir la imagen', { variant: 'error' });
      }
      return;
    }

    const currentItem = currentQuote?.items?.find(item => item.id === itemId);
    if (!currentItem) {
      enqueueSnackbar('Guarda los cambios antes de subir imágenes a ítems nuevos', { variant: 'warning' });
      return;
    }
    try {
      const uploadedFile = await quotesApi.uploadItemSampleImage(id!, itemId, file);
      const currentItems = getValues('items');
      setValue('items', currentItems.map((item) =>
        item.id === itemId ? { ...item, sampleImageId: uploadedFile.id } : item
      ));
      enqueueSnackbar('Imagen subida exitosamente', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
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
      await quotesApi.deleteItemSampleImage(id!, itemId);
      const currentItems = getValues('items');
      setValue('items', currentItems.map((item) =>
        item.id === itemId ? { ...item, sampleImageId: undefined } : item
      ));
      enqueueSnackbar('Imagen eliminada exitosamente', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
    } catch {
      enqueueSnackbar('Error al eliminar la imagen', { variant: 'error' });
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoadingQuote) return <LoadingSpinner />;

  // ── Step renderers ────────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Cliente e Información General
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
            currentUserId={user?.id}
            isAdmin={isAdmin}
            documentType="cotización"
          />
        )}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
              slotProps={{ textField: { fullWidth: true } }}
            />
          )}
        />

        <Controller
          name="commercialChannelId"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              fullWidth
              label="Canal de Venta *"
              error={!!errors.commercialChannelId}
              helperText={errors.commercialChannelId?.message}
              disabled={!isClientSelected || channelsLoading}
            >
              {channels.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          )}
        />
      </Stack>
    </Stack>
  );

  const renderStep1 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Ítems de la Cotización
      </Typography>

      {!isClientSelected && (
        <Typography variant="body2" color="text.secondary">
          Primero debe seleccionar un cliente para agregar ítems.
        </Typography>
      )}

      <Controller
        name="items"
        control={control}
        render={({ field }) => (
          <QuoteItemsTable
            items={field.value}
            onChange={field.onChange}
            errors={errors}
            disabled={!isClientSelected}
            quoteId={isEdit ? id : undefined}
            onImageUpload={handleImageUpload}
            onImageDelete={handleImageDelete}
          />
        )}
      />
    </Stack>
  );

  const renderStep2 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Totales e IVA
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
                items={items as any}
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
            placeholder="Información adicional para el cliente..."
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
              {channels.find((c) => c.id === commercialChannelId)?.name ?? '—'}
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
      {isSubmitting && <LoadingSpinner fullScreen message={isEdit ? 'Guardando cambios...' : 'Creando cotización...'} />}

      <PageHeader
        title={isEdit ? 'Editar Cotización' : 'Nueva Cotización'}
        breadcrumbs={[
          { label: 'Cotizaciones', path: '/quotes' },
          { label: isEdit ? 'Editar' : 'Nueva' },
        ]}
      />

      {/* ── PASOS TOP ── */}
      <Box
        sx={{
          position: 'relative',
          bgcolor: 'background.default',
          pt: 2,
          pb: 1,
          mb: 3,
          mx: { xs: -1, sm: -2, md: -3 },
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
                activeStep === 0 ? navigate('/quotes') : goToStep(activeStep - 1)
              }
              disabled={isSubmitting}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              {activeStep === 0 ? 'Cancelar' : 'Anterior'}
            </Button>

            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => goToStep(activeStep + 1)}
                disabled={!canGoNext() || isSubmitting}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
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
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Guardar Cotización'}
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default QuoteFormPage;
