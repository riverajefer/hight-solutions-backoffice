import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Stack,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  TextField,
  Autocomplete,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Collapse,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
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

// ─── Step Header (clickable row) ─────────────────────────────────────────────
interface StepHeaderProps {
  index: number;
  config: StepConfig;
  status: 'active' | 'completed' | 'pending';
  summary?: React.ReactNode;
  onClick?: () => void;
}

const StepHeader: React.FC<StepHeaderProps> = ({ index, config, status, summary, onClick }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isPending = status === 'pending';

  const numberBg = isActive
    ? theme.palette.primary.main
    : isCompleted
    ? theme.palette.success.main
    : alpha(theme.palette.text.primary, 0.12);

  const numberColor = isPending
    ? theme.palette.text.disabled
    : '#fff';

  return (
    <CardActionArea
      onClick={isCompleted && onClick ? onClick : undefined}
      disabled={isPending || isActive}
      sx={{
        borderRadius: 0,
        cursor: isCompleted ? 'pointer' : 'default',
        '&.Mui-disabled': { opacity: 1 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 3,
          py: 2,
          background: isActive
            ? isDark
              ? alpha(theme.palette.primary.main, 0.08)
              : alpha(theme.palette.primary.main, 0.04)
            : 'transparent',
          borderLeft: isActive
            ? `4px solid ${theme.palette.primary.main}`
            : '4px solid transparent',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Step number circle */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: numberBg,
            color: numberColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontWeight: 700,
            fontSize: '0.85rem',
            transition: 'background 0.25s ease',
            boxShadow: isActive
              ? `0 0 0 4px ${alpha(theme.palette.primary.main, 0.15)}`
              : 'none',
          }}
        >
          {isCompleted ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : index + 1}
        </Box>

        {/* Labels */}
        <Box flex={1} minWidth={0}>
          <Typography
            variant="subtitle2"
            fontWeight={isActive ? 700 : 600}
            color={isPending ? 'text.disabled' : isActive ? 'primary' : 'text.primary'}
            sx={{ lineHeight: 1.2 }}
          >
            {config.label}
          </Typography>
          {isCompleted && summary ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {summary}
            </Typography>
          ) : (
            <Typography
              variant="caption"
              color={isPending ? 'text.disabled' : 'text.secondary'}
            >
              {config.subtitle}
            </Typography>
          )}
        </Box>

        {/* Expand/collapse icon for completed */}
        {isCompleted && (
          <ExpandMoreIcon
            fontSize="small"
            sx={{ color: 'text.secondary', flexShrink: 0 }}
          />
        )}
        {isActive && (
          <ExpandLessIcon
            fontSize="small"
            sx={{ color: 'primary.main', flexShrink: 0 }}
          />
        )}
      </Box>
    </CardActionArea>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const WorkOrderFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const theme = useTheme();

  const { user } = useAuthStore();
  const { createWorkOrderMutation } = useWorkOrders();
  const { workOrderQuery, updateWorkOrderMutation } = useWorkOrder(id);

  const [activeStep, setActiveStep] = useState(0);
  // For accordion: track which completed step is expanded (null = none)
  const [expandedCompleted, setExpandedCompleted] = useState<number | null>(null);

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
    excludeWithWorkOrder: !isEdit, // En creación, excluir órdenes con OT activa
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
      // In edit mode start on step 1 (order is fixed)
      setActiveStep(1);
    }
  }, [isEdit, workOrderQuery.data]);

  // When order is selected, initialize item forms from order items (pre-fill production areas)
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

  const handleNext = () => {
    setExpandedCompleted(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setExpandedCompleted(null);
    setActiveStep((prev) => prev - 1);
  };

  const goToStep = (step: number) => {
    if (step < activeStep) {
      setExpandedCompleted(expandedCompleted === step ? null : step);
    }
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

  const canGoNext = () => {
    if (activeStep === 0) return isEdit || !!selectedOrder;
    if (activeStep === 1) return !fileNameError;
    return true;
  };

  // ── Summaries for completed steps ──────────────────────────────────────────
  const step0Summary = isEdit
    ? `${workOrderQuery.data?.order.orderNumber} — ${workOrderQuery.data?.order.client.name}`
    : selectedOrder
    ? `${selectedOrder.orderNumber} — ${selectedOrder.client?.name}`
    : '';

  const step1Summary = [
    fileName && `Archivo: ${fileName}`,
    designerId && availableUsers.find((u) => u.id === designerId)
      ? `Diseñador: ${(`${availableUsers.find((u) => u.id === designerId)?.firstName ?? ''} ${availableUsers.find((u) => u.id === designerId)?.lastName ?? ''}`).trim()}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ') || 'Sin archivo ni diseñador';

  const step2Summary = `${itemsForms.length} producto(s)`;

  const stepSummaries = [step0Summary, step1Summary, step2Summary, ''];

  if (isEdit && workOrderQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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

      <Stack
        direction="row"
        spacing={0}
        sx={{ mb: 3 }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(ROUTES.WORK_ORDERS)}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          Volver al listado
        </Button>
      </Stack>

      {/* ─── Vertical Accordion Stepper ────────────────────────────────────── */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {STEPS.map((stepConfig, index) => {
          const status =
            index === activeStep
              ? 'active'
              : index < activeStep
              ? 'completed'
              : 'pending';

          const isExpanded = index === activeStep || expandedCompleted === index;
          const showDivider = index < STEPS.length - 1;

          return (
            <Box key={index}>
              {/* Step Header */}
              <StepHeader
                index={index}
                config={stepConfig}
                status={status}
                summary={stepSummaries[index]}
                onClick={() => goToStep(index)}
              />

              {/* Step Content (accordion body) */}
              <Collapse in={isExpanded} timeout={280} unmountOnExit>
                <Box
                  sx={{
                    px: 3,
                    pt: 1,
                    pb: 3,
                    borderLeft: `4px solid ${
                      status === 'completed'
                        ? theme.palette.success.main
                        : theme.palette.primary.main
                    }`,
                    ml: 0,
                    background:
                      status === 'completed'
                        ? alpha(theme.palette.success.main, 0.02)
                        : 'transparent',
                  }}
                >
                  {/* ── STEP 0: Seleccionar Orden ── */}
                  {index === 0 && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Busca y selecciona la orden de pedido base para la OT.
                        Solo órdenes en estado <strong>CONFIRMADA</strong>, <strong>EN PRODUCCIÓN</strong> o <strong>LISTA</strong>.
                      </Typography>

                      {isEdit ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                          Vinculada a la orden{' '}
                          <strong>{workOrderQuery.data?.order.orderNumber}</strong> —{' '}
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
                            <Card
                              variant="outlined"
                              sx={{ borderRadius: 2, borderColor: 'primary.main' }}
                            >
                              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Stack
                                  direction="row"
                                  spacing={3}
                                  flexWrap="wrap"
                                  useFlexGap
                                >
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Orden
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {selectedOrder.orderNumber}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Cliente
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {selectedOrder.client?.name}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Total
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {formatCurrency(selectedOrder.total)}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Ítems
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {selectedOrder.items?.length ?? 0} producto(s)
                                    </Typography>
                                  </Box>
                                </Stack>
                              </CardContent>
                            </Card>
                          )}
                        </Stack>
                      )}
                    </Box>
                  )}

                  {/* ── STEP 1: Datos de la OT ── */}
                  {index === 1 && (
                    <Stack spacing={2.5}>
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
                          `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
                          user?.email ||
                          ''
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
                  )}

                  {/* ── STEP 2: Productos e Insumos ── */}
                  {index === 2 && (
                    <Stack spacing={2.5}>
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
                          <Card
                            key={itemForm.orderItemId}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                          >
                            <CardContent>
                              <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                mb={0.5}
                              >
                                <Typography variant="subtitle2" fontWeight={700}>
                                  Producto {i + 1}
                                </Typography>
                                {sourceItem?.quantity != null && (
                                  <Chip
                                    label={`Cant: ${sourceItem.quantity}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                gutterBottom
                              >
                                Original: {sourceItem?.description}
                              </Typography>
                              <Divider sx={{ my: 1.5 }} />

                              <Stack spacing={2}>
                                <TextField
                                  label="Descripción"
                                  value={itemForm.productDescription}
                                  onChange={(e) =>
                                    updateItemForm(i, 'productDescription', e.target.value)
                                  }
                                  fullWidth
                                  multiline
                                  rows={2}
                                  size="small"
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
                                      i,
                                      'productionAreaIds',
                                      value.map((v) => v.id),
                                    )
                                  }
                                  renderTags={(value, getTagProps) =>
                                    value.map((option, ti) => (
                                      <Chip
                                        label={option.name}
                                        {...getTagProps({ index: ti })}
                                        key={option.id}
                                        size="small"
                                      />
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
                                  getOptionLabel={(s) =>
                                    s.sku ? `${s.name} (${s.sku})` : s.name
                                  }
                                  value={supplies.filter((s) =>
                                    itemForm.supplies.some((si) => si.supplyId === s.id),
                                  )}
                                  onChange={(_, value) =>
                                    updateItemForm(
                                      i,
                                      'supplies',
                                      value.map((v) => ({ supplyId: v.id })),
                                    )
                                  }
                                  renderTags={(value, getTagProps) =>
                                    value.map((option, ti) => (
                                      <Chip
                                        label={option.name}
                                        {...getTagProps({ index: ti })}
                                        key={option.id}
                                        size="small"
                                      />
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
                                  onChange={(e) =>
                                    updateItemForm(i, 'observations', e.target.value)
                                  }
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
                  )}

                  {/* ── STEP 3: Observaciones y Confirmar ── */}
                  {index === 3 && (
                    <Stack spacing={2.5}>
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

                      {/* Mini resumen */}
                      <Card
                        variant="outlined"
                        sx={{ borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.03) }}
                      >
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
                  )}

                  {/* ── Navigation actions (active step only) ── */}
                  {status === 'active' && (
                    <Stack
                      direction="row"
                      justifyContent="flex-end"
                      spacing={1.5}
                      sx={{ mt: 3 }}
                    >
                      {activeStep > 0 && (
                        <Button
                          size="small"
                          onClick={handleBack}
                          disabled={isSaving}
                          sx={{ color: 'text.secondary' }}
                        >
                          Anterior
                        </Button>
                      )}

                      {activeStep < STEPS.length - 1 ? (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={handleNext}
                          disabled={!canGoNext() || isSaving}
                          endIcon={<AssignmentTurnedInIcon />}
                        >
                          Siguiente paso
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                          >
                            {isSaving ? <CircularProgress size={16} /> : 'Guardar Borrador'}
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
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
                        </>
                      )}
                    </Stack>
                  )}
                </Box>
              </Collapse>

              {showDivider && <Divider />}
            </Box>
          );
        })}
      </Card>
    </Box>
  );
};

export default WorkOrderFormPage;
