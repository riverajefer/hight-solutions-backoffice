import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Stack,
  Card,
  CardContent,
  Typography,
  TextField,
  Autocomplete,
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import { useWorkOrders, useWorkOrder } from '../hooks';
import { useOrders } from '../../orders/hooks';
import { useProductionAreas } from '../../production-areas/hooks/useProductionAreas';
import { useSupplies } from '../../portfolio/supplies/hooks/useSupplies';
import { useUsers } from '../../users/hooks/useUsers';
import { useAuthStore } from '../../../store/authStore';
import { ROUTES } from '../../../utils/constants';
import type { Order } from '../../../types/order.types';
import type {
  CreateWorkOrderDto,
  CreateWorkOrderItemDto,
  UpdateWorkOrderDto,
  SupplyInputDto,
} from '../../../types/work-order.types';

const STEPS = [
  'Seleccionar Orden',
  'Datos de la OT',
  'Productos e Insumos',
  'Confirmar',
];

const formatCurrency = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(isNaN(num) ? 0 : num);
};

interface WorkOrderItemForm {
  orderItemId: string;
  productDescription: string;
  productionAreaIds: string[];
  supplies: SupplyInputDto[];
  observations: string;
}

export const WorkOrderFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { user } = useAuthStore();
  const { createWorkOrderMutation } = useWorkOrders();
  const { workOrderQuery, updateWorkOrderMutation } = useWorkOrder(id);

  const [activeStep, setActiveStep] = useState(0);

  // Step 1: Order selection
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Step 2: OT data
  const [designerId, setDesignerId] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileNameError, setFileNameError] = useState('');

  // Step 3: Items form
  const [itemsForms, setItemsForms] = useState<WorkOrderItemForm[]>([]);

  // Step 4: Observations
  const [observations, setObservations] = useState('');

  // Data queries
  const { ordersQuery } = useOrders({ search: orderSearch, limit: 30, status: undefined });
  const { usersQuery } = useUsers();
  const { productionAreasQuery } = useProductionAreas();
  const { suppliesQuery } = useSupplies();

  const availableOrders = (ordersQuery.data?.data ?? []).filter((o: Order) =>
    ['CONFIRMED', 'IN_PRODUCTION', 'READY'].includes(o.status),
  );
  const availableUsers = (usersQuery.data as { id: string; firstName?: string | null; lastName?: string | null; email: string }[]) ?? [];
  const productionAreas = (productionAreasQuery.data as { id: string; name: string }[]) ?? [];
  const supplies = (suppliesQuery.data as { id: string; name: string; sku?: string | null }[]) ?? [];

  // Load edit data
  useEffect(() => {
    if (isEdit && workOrderQuery.data) {
      const wo = workOrderQuery.data;
      setDesignerId(wo.designer?.id ?? null);
      setFileName(wo.fileName ?? '');
      setObservations(wo.observations ?? '');
      setItemsForms(
        wo.items.map((item) => ({
          orderItemId: item.orderItem.id,
          productDescription: item.productDescription,
          productionAreaIds: item.productionAreas.map((pa) => pa.productionArea.id),
          supplies: item.supplies.map((s) => ({
            supplyId: s.supply.id,
            quantity: s.quantity ? parseFloat(s.quantity) : undefined,
            notes: s.notes ?? undefined,
          })),
          observations: item.observations ?? '',
        })),
      );
    }
  }, [isEdit, workOrderQuery.data]);

  // When order is selected, initialize item forms from order items
  useEffect(() => {
    if (selectedOrder && !isEdit) {
      setItemsForms(
        selectedOrder.items.map((item) => ({
          orderItemId: item.id,
          productDescription: item.description,
          productionAreaIds: [],
          supplies: [],
          observations: '',
        })),
      );
    }
  }, [selectedOrder, isEdit]);

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleFileNameChange = (value: string) => {
    setFileName(value);
    if (value.length > 30) {
      setFileNameError('Máximo 30 caracteres');
    } else {
      setFileNameError('');
    }
  };

  const updateItemForm = (index: number, field: keyof WorkOrderItemForm, value: unknown) => {
    setItemsForms((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const buildCreateDto = (): CreateWorkOrderDto => {
    const items: CreateWorkOrderItemDto[] = itemsForms.map((form) => ({
      orderItemId: form.orderItemId,
      productDescription: form.productDescription,
      productionAreaIds: form.productionAreaIds.length > 0 ? form.productionAreaIds : undefined,
      supplies: form.supplies.length > 0 ? form.supplies : undefined,
      observations: form.observations || undefined,
    }));

    return {
      orderId: selectedOrder!.id,
      designerId: designerId ?? undefined,
      fileName: fileName || undefined,
      observations: observations || undefined,
      items,
    };
  };

  const buildUpdateDto = (): UpdateWorkOrderDto => {
    const items: CreateWorkOrderItemDto[] = itemsForms.map((form) => ({
      orderItemId: form.orderItemId,
      productDescription: form.productDescription,
      productionAreaIds: form.productionAreaIds.length > 0 ? form.productionAreaIds : undefined,
      supplies: form.supplies.length > 0 ? form.supplies : undefined,
      observations: form.observations || undefined,
    }));

    return {
      designerId: designerId ?? undefined,
      fileName: fileName || undefined,
      observations: observations || undefined,
      items,
    };
  };

  const handleSaveDraft = async () => {
    if (isEdit) {
      const dto = buildUpdateDto();
      await updateWorkOrderMutation.mutateAsync({ id: id!, dto });
      navigate(ROUTES.WORK_ORDERS_DETAIL.replace(':id', id!));
    } else {
      const dto = buildCreateDto();
      const newWo = await createWorkOrderMutation.mutateAsync({ dto, confirmed: false });
      navigate(ROUTES.WORK_ORDERS_DETAIL.replace(':id', newWo.id));
    }
  };

  const handleConfirm = async () => {
    if (isEdit) {
      const dto = buildUpdateDto();
      await updateWorkOrderMutation.mutateAsync({ id: id!, dto });
      navigate(ROUTES.WORK_ORDERS_DETAIL.replace(':id', id!));
    } else {
      const dto = buildCreateDto();
      const newWo = await createWorkOrderMutation.mutateAsync({ dto, confirmed: true });
      navigate(ROUTES.WORK_ORDERS_DETAIL.replace(':id', newWo.id));
    }
  };

  const isSaving = createWorkOrderMutation.isPending || updateWorkOrderMutation.isPending;

  const canGoNext = () => {
    if (activeStep === 0) return isEdit || !!selectedOrder;
    if (activeStep === 1) return !fileNameError;
    return true;
  };

  if (isEdit && workOrderQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}
        subtitle={isEdit ? `Editando ${workOrderQuery.data?.workOrderNumber}` : 'Crear OT desde una orden de pedido'}
      />

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* ─── STEP 1: Seleccionar Orden ─────────────────────────────────── */}
      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Seleccionar Orden de Pedido
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Busca y selecciona la orden de pedido desde la que se generará la OT.
              Solo se muestran órdenes en estado CONFIRMADA, EN PRODUCCIÓN o LISTA.
            </Typography>

            {isEdit ? (
              <Alert severity="info">
                Editando OT vinculada a la orden <strong>{workOrderQuery.data?.order.orderNumber}</strong> —
                Cliente: <strong>{workOrderQuery.data?.order.client.name}</strong>
              </Alert>
            ) : (
              <Stack spacing={3}>
                <Autocomplete
                  options={availableOrders}
                  getOptionLabel={(o) => `${o.orderNumber} — ${o.client?.name ?? ''}`}
                  value={selectedOrder}
                  onChange={(_, value) => setSelectedOrder(value)}
                  inputValue={orderSearch}
                  onInputChange={(_, value) => setOrderSearch(value)}
                  loading={ordersQuery.isLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Buscar orden por número o cliente"
                      placeholder="Escribe para buscar..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  noOptionsText="No se encontraron órdenes"
                />

                {selectedOrder && (
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {selectedOrder.orderNumber}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Cliente:</strong> {selectedOrder.client?.name}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Total:</strong> {formatCurrency(selectedOrder.total)}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Items:</strong> {selectedOrder.items?.length ?? 0} producto(s)
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── STEP 2: Datos de la OT ─────────────────────────────────────── */}
      {activeStep === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Datos de la Orden de Trabajo
            </Typography>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="Nº OT"
                value="Se asignará automáticamente (OT-XXXX-XXXX)"
                disabled
                fullWidth
              />

              <TextField
                label="Asesor"
                value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || ''}
                disabled
                fullWidth
              />

              <Autocomplete
                options={availableUsers}
                getOptionLabel={(u) =>
                  `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
                }
                value={availableUsers.find((u) => u.id === designerId) ?? null}
                onChange={(_, value) => setDesignerId(value?.id ?? null)}
                renderInput={(params) => (
                  <TextField {...params} label="Diseñador (opcional)" />
                )}
                clearOnEscape
              />

              <TextField
                label="Nombre del archivo"
                value={fileName}
                onChange={(e) => handleFileNameChange(e.target.value)}
                error={!!fileNameError}
                helperText={fileNameError || `${fileName.length}/30 caracteres`}
                inputProps={{ maxLength: 30 }}
                fullWidth
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ─── STEP 3: Productos e Insumos ────────────────────────────────── */}
      {activeStep === 2 && (
        <Stack spacing={3}>
          <Typography variant="h6">Productos e Insumos</Typography>
          {itemsForms.length === 0 && (
            <Alert severity="warning">
              No hay items para configurar. Vuelve al paso 1 y selecciona una orden.
            </Alert>
          )}
          {itemsForms.map((itemForm, index) => {
            const sourceItem = isEdit
              ? workOrderQuery.data?.items[index]?.orderItem
              : selectedOrder?.items[index];

            return (
              <Card key={itemForm.orderItemId} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Producto {index + 1}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Original: {sourceItem?.description}
                    {sourceItem?.quantity != null && ` (Cant: ${sourceItem.quantity})`}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />

                  <Stack spacing={2}>
                    <TextField
                      label="Descripción"
                      value={itemForm.productDescription}
                      onChange={(e) =>
                        updateItemForm(index, 'productDescription', e.target.value)
                      }
                      fullWidth
                      multiline
                      rows={2}
                    />

                    <Autocomplete
                      multiple
                      options={productionAreas}
                      getOptionLabel={(pa) => pa.name}
                      value={productionAreas.filter((pa) =>
                        itemForm.productionAreaIds.includes(pa.id),
                      )}
                      onChange={(_, value) =>
                        updateItemForm(
                          index,
                          'productionAreaIds',
                          value.map((v) => v.id),
                        )
                      }
                      renderTags={(value, getTagProps) =>
                        value.map((option, i) => (
                          <Chip label={option.name} {...getTagProps({ index: i })} key={option.id} />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Áreas de producción"
                          placeholder="Selecciona una o más áreas"
                        />
                      )}
                    />

                    <Autocomplete
                      multiple
                      options={supplies}
                      getOptionLabel={(s) => s.sku ? `${s.name} (${s.sku})` : s.name}
                      value={supplies.filter((s) =>
                        itemForm.supplies.some((si) => si.supplyId === s.id),
                      )}
                      onChange={(_, value) =>
                        updateItemForm(
                          index,
                          'supplies',
                          value.map((v) => ({ supplyId: v.id })),
                        )
                      }
                      renderTags={(value, getTagProps) =>
                        value.map((option, i) => (
                          <Chip label={option.name} {...getTagProps({ index: i })} key={option.id} />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Insumos (opcional)"
                          placeholder="Selecciona insumos necesarios"
                        />
                      )}
                    />

                    <TextField
                      label="Observaciones del item"
                      value={itemForm.observations}
                      onChange={(e) =>
                        updateItemForm(index, 'observations', e.target.value)
                      }
                      fullWidth
                      multiline
                      rows={2}
                    />
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* ─── STEP 4: Observaciones y Confirmar ──────────────────────────── */}
      {activeStep === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Observaciones Generales
            </Typography>
            <TextField
              label="Observaciones generales de la OT"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              fullWidth
              multiline
              rows={4}
              sx={{ mt: 2 }}
            />
          </CardContent>
        </Card>
      )}

      {/* ─── Navigation Buttons ──────────────────────────────────────────── */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 4 }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={activeStep === 0 ? () => navigate(ROUTES.WORK_ORDERS) : handleBack}
          disabled={isSaving}
        >
          {activeStep === 0 ? 'Cancelar' : 'Anterior'}
        </Button>

        <Stack direction="row" spacing={2}>
          {activeStep === STEPS.length - 1 ? (
            <>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? <CircularProgress size={20} /> : 'Guardar Borrador'}
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                onClick={handleConfirm}
                disabled={isSaving}
                color="success"
              >
                {isSaving ? <CircularProgress size={20} /> : isEdit ? 'Guardar' : 'Crear OT'}
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={handleNext}
              disabled={!canGoNext() || isSaving}
            >
              Siguiente
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default WorkOrderFormPage;
