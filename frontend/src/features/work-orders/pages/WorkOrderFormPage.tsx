import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
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
  alpha,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  EditNote as EditNoteIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Inventory2 as Inventory2Icon,
  Notes as NotesIcon,
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

// ─── Step config ──────────────────────────────────────────────────────────────

interface StepConfig {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
  { label: 'Seleccionar Orden', subtitle: 'Orden de pedido base', icon: <SearchIcon fontSize="small" /> },
  { label: 'Datos de la OT', subtitle: 'Asesor, diseñador y archivo', icon: <EditNoteIcon fontSize="small" /> },
  { label: 'Productos e Insumos', subtitle: 'Áreas y materiales por ítem', icon: <Inventory2Icon fontSize="small" /> },
  { label: 'Observaciones y Confirmar', subtitle: 'Notas finales y guardar', icon: <NotesIcon fontSize="small" /> },
];

// ─── StepHeader component ─────────────────────────────────────────────────────

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

  const successGreen = theme.palette.success.dark; // #10B981

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
      {/* Número + badge de check */}
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

// ─── Main Component ───────────────────────────────────────────────────────────
export const WorkOrderFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { user } = useAuthStore();
  const { createWorkOrderMutation } = useWorkOrders();
  const { workOrderQuery, updateWorkOrderMutation } = useWorkOrder(id);

  const [activeStep, setActiveStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

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
  const { ordersQuery } = useOrders({
    search: orderSearch,
    limit: 30,
    status: undefined,
    excludeWithWorkOrder: !isEdit,
  });
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
      // En edición todos los pasos ya estuvieron completados
      setActiveStep(1);
      setVisitedSteps(new Set([0, 1, 2, 3]));
    }
  }, [isEdit, workOrderQuery.data]);

  // When order is selected, initialize item forms
  useEffect(() => {
    if (selectedOrder && !isEdit) {
      setItemsForms(
        selectedOrder.items.map((item) => ({
          orderItemId: item.id,
          productDescription: item.description,
          productionAreaIds: item.productionAreas?.map((pa) => pa.productionArea.id) ?? [],
          supplies: [],
          observations: '',
        })),
      );
    }
  }, [selectedOrder, isEdit]);

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const goToStep = (step: number) => {
    setActiveStep(step);
    setVisitedSteps((prev) => new Set([...prev, step]));
  };

  const getStepStatus = (i: number): 'active' | 'completed' | 'visited' | 'pending' => {
    if (i === activeStep) return 'active';
    if (!visitedSteps.has(i)) return 'pending';
    const validByStep = [
      isEdit || !!selectedOrder,   // step 0
      !fileNameError,               // step 1
      true,                         // step 2 — siempre válido
      true,                         // step 3
    ];
    return validByStep[i] ? 'completed' : 'visited';
  };

  const handleFileNameChange = (value: string) => {
    setFileName(value);
    setFileNameError(value.length > 30 ? 'Máximo 30 caracteres' : '');
  };

  const updateItemForm = (index: number, field: keyof WorkOrderItemForm, value: unknown) => {
    setItemsForms((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const canGoNext = () => {
    if (activeStep === 0) return isEdit || !!selectedOrder;
    if (activeStep === 1) return !fileNameError;
    return true;
  };

  // ─── Build DTOs ───────────────────────────────────────────────────────────────

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
      await updateWorkOrderMutation.mutateAsync({ id: id!, dto: buildUpdateDto() });
      navigate(ROUTES.WORK_ORDERS_DETAIL.replace(':id', id!));
    } else {
      const newWo = await createWorkOrderMutation.mutateAsync({ dto: buildCreateDto(), confirmed: false });
      navigate(ROUTES.WORK_ORDERS_DETAIL.replace(':id', newWo.id));
    }
  };

  const handleConfirm = async () => {
    if (isEdit) {
      await updateWorkOrderMutation.mutateAsync({ id: id!, dto: buildUpdateDto() });
      navigate(ROUTES.WORK_ORDERS_DETAIL.replace(':id', id!));
    } else {
      const newWo = await createWorkOrderMutation.mutateAsync({ dto: buildCreateDto(), confirmed: true });
      navigate(ROUTES.WORK_ORDERS_DETAIL.replace(':id', newWo.id));
    }
  };

  const isSaving = createWorkOrderMutation.isPending || updateWorkOrderMutation.isPending;

  // ─── Summaries ────────────────────────────────────────────────────────────────

  const step0Summary = isEdit
    ? `${workOrderQuery.data?.order.orderNumber} — ${workOrderQuery.data?.order.client.name}`
    : selectedOrder
    ? `${selectedOrder.orderNumber} — ${selectedOrder.client?.name}`
    : '';

  // ─── Loading ──────────────────────────────────────────────────────────────────

  if (isEdit && workOrderQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  // ─── Step renderers ───────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Seleccionar Orden de Pedido
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Busca y selecciona la orden de pedido base para la OT. Solo órdenes en estado{' '}
        <strong>CONFIRMADA</strong>, <strong>EN PRODUCCIÓN</strong> o <strong>LISTA</strong>.
      </Typography>

      {isEdit ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Vinculada a la orden <strong>{workOrderQuery.data?.order.orderNumber}</strong> —{' '}
          <strong>{workOrderQuery.data?.order.client.name}</strong>
        </Alert>
      ) : (
        <Stack spacing={2.5}>
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
            <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'primary.main' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Orden</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedOrder.orderNumber}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Cliente</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedOrder.client?.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(selectedOrder.total)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Ítems</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedOrder.items?.length ?? 0} producto(s)</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}
    </Stack>
  );

  const renderStep1 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Datos de la Orden de Trabajo
      </Typography>

      <TextField
        label="Nº OT"
        value={
          isEdit
            ? workOrderQuery.data?.workOrderNumber ?? 'Cargando...'
            : 'Se asignará automáticamente (OT-XXXX-XXXX)'
        }
        disabled
        fullWidth
        size="small"
      />

      <TextField
        label="Asesor"
        value={
          `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || ''
        }
        disabled
        fullWidth
        size="small"
      />

      <Autocomplete
        options={availableUsers}
        getOptionLabel={(u) =>
          `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
        }
        value={availableUsers.find((u) => u.id === designerId) ?? null}
        onChange={(_, value) => setDesignerId(value?.id ?? null)}
        renderInput={(params) => (
          <TextField {...params} label="Diseñador (opcional)" size="small" />
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
        size="small"
      />
    </Stack>
  );

  const renderStep2 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Productos e Insumos
      </Typography>

      {itemsForms.length === 0 && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          No hay ítems para configurar. Vuelve al paso 1 y selecciona una orden.
        </Alert>
      )}

      {itemsForms.map((itemForm, i) => {
        const sourceItem = isEdit
          ? workOrderQuery.data?.items[i]?.orderItem
          : selectedOrder?.items[i];

        return (
          <Card key={itemForm.orderItemId} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Producto {i + 1}
                </Typography>
                {sourceItem?.quantity != null && (
                  <Chip label={`Cant: ${sourceItem.quantity}`} size="small" variant="outlined" />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Original: {sourceItem?.description}
              </Typography>
              <Divider sx={{ my: 1.5 }} />

              <Stack spacing={2}>
                <TextField
                  label="Descripción"
                  value={itemForm.productDescription}
                  onChange={(e) => updateItemForm(i, 'productDescription', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                />

                <Autocomplete
                  multiple
                  options={productionAreas}
                  getOptionLabel={(pa) => pa.name}
                  value={productionAreas.filter((pa) => itemForm.productionAreaIds.includes(pa.id))}
                  onChange={(_, value) =>
                    updateItemForm(i, 'productionAreaIds', value.map((v) => v.id))
                  }
                  renderTags={(value, getTagProps) =>
                    value.map((option, ti) => (
                      <Chip label={option.name} {...getTagProps({ index: ti })} key={option.id} size="small" />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Áreas de producción"
                      placeholder="Selecciona una o más áreas"
                      size="small"
                    />
                  )}
                />

                <Autocomplete
                  multiple
                  options={supplies}
                  getOptionLabel={(s) => s.sku ? `${s.name} (${s.sku})` : s.name}
                  value={supplies.filter((s) => itemForm.supplies.some((si) => si.supplyId === s.id))}
                  onChange={(_, value) =>
                    updateItemForm(i, 'supplies', value.map((v) => ({ supplyId: v.id })))
                  }
                  renderTags={(value, getTagProps) =>
                    value.map((option, ti) => (
                      <Chip label={option.name} {...getTagProps({ index: ti })} key={option.id} size="small" />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Insumos (opcional)"
                      placeholder="Selecciona insumos necesarios"
                      size="small"
                    />
                  )}
                />

                <TextField
                  label="Observaciones del ítem"
                  value={itemForm.observations}
                  onChange={(e) => updateItemForm(i, 'observations', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                />
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );

  const renderStep3 = () => {
    return (
      <Stack spacing={3}>
        <Typography variant="h6" fontWeight={600}>
          Observaciones y Confirmar
        </Typography>

        <TextField
          label="Observaciones generales de la OT"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          fullWidth
          multiline
          rows={4}
          size="small"
          placeholder="Instrucciones especiales, notas de producción..."
        />

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
              RESUMEN
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="body2">
                <strong>Orden:</strong> {step0Summary}
              </Typography>
              <Typography variant="body2">
                <strong>Archivo:</strong> {fileName || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Productos:</strong> {itemsForms.length}
              </Typography>
              {designerId && availableUsers.find((u) => u.id === designerId) && (
                <Typography variant="body2">
                  <strong>Diseñador:</strong>{' '}
                  {`${availableUsers.find((u) => u.id === designerId)?.firstName ?? ''} ${availableUsers.find((u) => u.id === designerId)?.lastName ?? ''}`.trim()}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}
        subtitle={
          isEdit
            ? `Editando ${workOrderQuery.data?.workOrderNumber}`
            : 'Crear OT desde una orden de pedido'
        }
      />

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
                activeStep === 0 ? navigate(ROUTES.WORK_ORDERS) : goToStep(activeStep - 1)
              }
              disabled={isSaving}
            >
              {activeStep === 0 ? 'Cancelar' : 'Anterior'}
            </Button>

            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                endIcon={<AssignmentTurnedInIcon />}
                onClick={() => goToStep(activeStep + 1)}
                disabled={!canGoNext() || isSaving}
              >
                Siguiente
              </Button>
            ) : (
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  {isSaving ? <CircularProgress size={16} /> : 'Guardar Borrador'}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleConfirm}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <CircularProgress size={16} />
                  ) : isEdit ? (
                    'Guardar'
                  ) : (
                    'Crear OT'
                  )}
                </Button>
              </Stack>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default WorkOrderFormPage;
