import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Stack,
  Card,
  CardContent,
  Typography,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../components/common/PageHeader';
import { useCreateProductionOrder, useProductTemplates } from '../hooks/useProduction';
import { useWorkOrders } from '../../work-orders/hooks/useWorkOrders';
import { ROUTES } from '../../../utils/constants';

const formSchema = z.object({
  templateId: z.string().uuid('Selecciona una plantilla'),
  workOrderId: z.string().uuid('Selecciona una Orden de Trabajo'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ProductionOrderFormPage: React.FC = () => {
  const navigate = useNavigate();
  const createOrder = useCreateProductionOrder();
  const templatesQuery = useProductTemplates({ isActive: true });
  const { workOrdersQuery } = useWorkOrders();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateId: '',
      workOrderId: '',
      notes: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    const order = await createOrder.mutateAsync({
      templateId: data.templateId,
      workOrderId: data.workOrderId,
      ...(data.notes ? { notes: data.notes } : {}),
    });
    if (order?.id) {
      navigate(ROUTES.PRODUCTION_ORDERS_DETAIL.replace(':id', order.id));
    } else {
      navigate(ROUTES.PRODUCTION_ORDERS);
    }
  };

  const templates = templatesQuery.data ?? [];
  const workOrders = workOrdersQuery.data?.data ?? [];

  return (
    <Box>
      <PageHeader
        title="Nueva Orden de Producción"
        subtitle="Instancia una plantilla de producto para una OT de trabajo"
        icon={<PrecisionManufacturingIcon />}
        action={
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(ROUTES.PRODUCTION_ORDERS)}
          >
            Volver
          </Button>
        }
      />

      <Box component="form" onSubmit={handleSubmit(onSubmit)} maxWidth={600}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              Configuración
            </Typography>
            <Stack spacing={2}>
              <Controller
                name="templateId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Plantilla de producto"
                    fullWidth
                    error={!!errors.templateId}
                    helperText={errors.templateId?.message}
                    disabled={templatesQuery.isLoading}
                  >
                    {templates.map((t: any) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name} — {t.category}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="workOrderId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Orden de Trabajo"
                    fullWidth
                    error={!!errors.workOrderId}
                    helperText={errors.workOrderId?.message}
                    disabled={workOrdersQuery.isLoading}
                  >
                    {workOrders.map((wo: any) => (
                      <MenuItem key={wo.id} value={wo.id}>
                        {wo.workOrderNumber} — {wo.order?.client?.name || 'Sin cliente'}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notas adicionales (opcional)"
                    multiline
                    rows={3}
                    fullWidth
                  />
                )}
              />
            </Stack>

            {createOrder.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {(createOrder.error as any)?.response?.data?.message ?? 'Error al crear la orden'}
              </Alert>
            )}
          </CardContent>
        </Card>

        <Stack direction="row" justifyContent="flex-end" spacing={2} mt={2}>
          <Button onClick={() => navigate(ROUTES.PRODUCTION_ORDERS)}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || createOrder.isPending}
          >
            {createOrder.isPending ? <CircularProgress size={20} /> : 'Crear orden'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default ProductionOrderFormPage;
