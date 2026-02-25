import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  Autocomplete,
  Divider,
  CircularProgress,
  Alert,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  InputAdornment,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  Person as PersonIcon,
  ReceiptLong as ReceiptLongIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import { useExpenseOrders, useExpenseOrder, useExpenseTypes } from '../hooks';
import { useUsers } from '../../users/hooks/useUsers';
import { useWorkOrders } from '../../work-orders/hooks';
import { useProductionAreas } from '../../production-areas/hooks/useProductionAreas';
import { ROUTES } from '../../../utils/constants';
import {
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  ExpenseOrderStatus,
  type CreateExpenseItemDto,
  type CreateExpenseOrderDto,
  type UpdateExpenseOrderDto,
} from '../../../types/expense-order.types';

// ─── Item form shape ──────────────────────────────────────────────────────────

interface ExpenseItemForm {
  quantity: string;
  name: string;
  description: string;
  supplierId: string;
  supplierLabel: string;
  unitPrice: string;
  paymentMethod: PaymentMethod;
  productionAreaIds: string[];
  receiptFileId: string;
}

const defaultItem = (): ExpenseItemForm => ({
  quantity: '1',
  name: '',
  description: '',
  supplierId: '',
  supplierLabel: '',
  unitPrice: '',
  paymentMethod: PaymentMethod.CASH,
  productionAreaIds: [],
  receiptFileId: '',
});

// ─── Step config ──────────────────────────────────────────────────────────────

interface StepConfig {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
  { label: 'Tipo de Gasto', subtitle: 'Categoría y OT asociada', icon: <CategoryIcon fontSize="small" /> },
  { label: 'Autorización', subtitle: 'Responsables y observaciones', icon: <PersonIcon fontSize="small" /> },
  { label: 'Ítems de Gasto', subtitle: 'Detalle de gastos y pagos', icon: <ReceiptLongIcon fontSize="small" /> },
  { label: 'Confirmar', subtitle: 'Resumen y guardar', icon: <NotesIcon fontSize="small" /> },
];

// ─── StepHeader component ─────────────────────────────────────────────────────

interface StepHeaderProps {
  index: number;
  config: StepConfig;
  status: 'active' | 'completed' | 'pending';
  onClick?: () => void;
}

const StepHeader: React.FC<StepHeaderProps> = ({ index, config, status, onClick }) => {
  const theme = useTheme();
  const isActive = status === 'active';
  const isCompleted = status === 'completed';

  const numberBg = isActive
    ? theme.palette.primary.main
    : isCompleted
    ? theme.palette.success.main
    : theme.palette.action.disabled;

  return (
    <Box
      onClick={isCompleted ? onClick : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        cursor: isCompleted ? 'pointer' : 'default',
        borderRadius: 2,
        bgcolor: isActive ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
        border: isActive ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : '1px solid transparent',
      }}
    >
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
          flexShrink: 0,
        }}
      >
        {isCompleted ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : index + 1}
      </Box>
      <Box>
        <Typography variant="subtitle2" fontWeight={600} color={isActive ? 'primary' : 'text.primary'}>
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

export const ExpenseOrderFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [activeStep, setActiveStep] = useState(0);

  // ─── Step 1: Type & OT ──────────────────────────────────────────────────────
  const [expenseTypeId, setExpenseTypeId] = useState('');
  const [expenseSubcategoryId, setExpenseSubcategoryId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');

  // ─── Step 2: Authorization ──────────────────────────────────────────────────
  const [authorizedToId, setAuthorizedToId] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [observations, setObservations] = useState('');
  const [areaOrMachine, setAreaOrMachine] = useState('');

  // ─── Step 3: Items ──────────────────────────────────────────────────────────
  const [items, setItems] = useState<ExpenseItemForm[]>([defaultItem()]);

  // ─── Data queries ───────────────────────────────────────────────────────────
  const { data: expenseTypes = [], isLoading: loadingTypes } = useExpenseTypes();
  const { workOrdersQuery } = useWorkOrders({ limit: 100 });
  const workOrders = workOrdersQuery.data?.data ?? [];
  const { usersQuery } = useUsers();
  const users = usersQuery.data ?? [];
  const { productionAreasQuery } = useProductionAreas();
  const productionAreas = productionAreasQuery.data ?? [];

  // ─── Edit: load existing OG ──────────────────────────────────────────────────
  const { expenseOrderQuery } = useExpenseOrder(id);
  const existingOG = expenseOrderQuery.data;

  useEffect(() => {
    if (existingOG) {
      setExpenseTypeId(existingOG.expenseType.id);
      setExpenseSubcategoryId(existingOG.expenseSubcategory.id);
      setWorkOrderId(existingOG.workOrder?.id ?? '');
      setAuthorizedToId(existingOG.authorizedTo.id);
      setResponsibleId(existingOG.responsible?.id ?? '');
      setObservations(existingOG.observations ?? '');
      setAreaOrMachine(existingOG.areaOrMachine ?? '');
      if (existingOG.items.length) {
        setItems(
          existingOG.items.map((item) => ({
            quantity: item.quantity,
            name: item.name,
            description: item.description ?? '',
            supplierId: item.supplier?.id ?? '',
            supplierLabel: item.supplier?.name ?? '',
            unitPrice: item.unitPrice,
            paymentMethod: item.paymentMethod,
            productionAreaIds: item.productionAreas.map((pa) => pa.productionArea.id),
            receiptFileId: item.receiptFileId ?? '',
          })),
        );
      }
    }
  }, [existingOG]);

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const { createExpenseOrderMutation } = useExpenseOrders();
  const { updateExpenseOrderMutation } = useExpenseOrder(id);

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const selectedType = expenseTypes.find((t) => t.id === expenseTypeId);
  const subcategories = selectedType?.subcategories ?? [];
  const hasWorkOrder = !!workOrderId;

  const totalAmount = useMemo(() => {
    return items.reduce((acc, item) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.unitPrice) || 0;
      return acc + q * p;
    }, 0);
  }, [items]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);

  // ─── Item helpers ─────────────────────────────────────────────────────────────
  const addItem = () => setItems((prev) => [...prev, defaultItem()]);

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof ExpenseItemForm, value: unknown) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  // ─── Validation per step ──────────────────────────────────────────────────────
  const isStep1Valid = !!expenseTypeId && !!expenseSubcategoryId;
  const isStep2Valid = !!authorizedToId;
  const isStep3Valid = items.every(
    (item) =>
      item.name.trim() &&
      parseFloat(item.quantity) > 0 &&
      parseFloat(item.unitPrice) > 0,
  );

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const buildPayload = (): CreateExpenseOrderDto => ({
    expenseTypeId,
    expenseSubcategoryId,
    workOrderId: workOrderId || undefined,
    authorizedToId,
    responsibleId: responsibleId || undefined,
    observations: observations || undefined,
    areaOrMachine: areaOrMachine || undefined,
    items: items.map((item) => ({
      quantity: parseFloat(item.quantity),
      name: item.name.trim(),
      description: item.description || undefined,
      supplierId: item.supplierId || undefined,
      unitPrice: parseFloat(item.unitPrice),
      paymentMethod: item.paymentMethod,
      productionAreaIds: hasWorkOrder && item.productionAreaIds.length
        ? item.productionAreaIds
        : undefined,
      receiptFileId: item.receiptFileId || undefined,
    })) as CreateExpenseItemDto[],
  });

  const handleSaveDraft = async () => {
    if (isEditing) {
      const payload = buildPayload();
      await updateExpenseOrderMutation.mutateAsync({ id: id!, dto: payload as UpdateExpenseOrderDto });
      navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', id!));
    } else {
      const og = await createExpenseOrderMutation.mutateAsync({ dto: buildPayload() });
      navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', og.id));
    }
  };

  const handleCreate = async () => {
    if (isEditing) {
      const payload = buildPayload();
      await updateExpenseOrderMutation.mutateAsync({ id: id!, dto: payload as UpdateExpenseOrderDto });
      navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', id!));
    } else {
      const og = await createExpenseOrderMutation.mutateAsync({
        dto: buildPayload(),
        confirmed: true,
      });
      navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', og.id));
    }
  };

  const isSubmitting =
    createExpenseOrderMutation.isPending || updateExpenseOrderMutation.isPending;

  // ─── Loading state for edit ───────────────────────────────────────────────────
  if (isEditing && expenseOrderQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (
    isEditing &&
    existingOG &&
    existingOG.status !== ExpenseOrderStatus.DRAFT &&
    existingOG.status !== ExpenseOrderStatus.CREATED
  ) {
    return (
      <Box>
        <PageHeader title="Editar OG" />
        <Alert severity="warning">
          Esta OG no se puede editar en su estado actual ({existingOG.status}).
        </Alert>
      </Box>
    );
  }

  // ─── Steps render ─────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Clasificación del Gasto
      </Typography>

      <Autocomplete
        options={expenseTypes}
        getOptionLabel={(opt) => opt.name}
        value={expenseTypes.find((t) => t.id === expenseTypeId) ?? null}
        onChange={(_, val) => {
          setExpenseTypeId(val?.id ?? '');
          setExpenseSubcategoryId('');
        }}
        loading={loadingTypes}
        renderInput={(params) => (
          <TextField {...params} label="Tipo de gasto *" placeholder="Seleccionar tipo..." />
        )}
      />

      <Autocomplete
        options={subcategories}
        getOptionLabel={(opt) => opt.name}
        value={subcategories.find((s) => s.id === expenseSubcategoryId) ?? null}
        onChange={(_, val) => setExpenseSubcategoryId(val?.id ?? '')}
        disabled={!expenseTypeId}
        renderInput={(params) => (
          <TextField {...params} label="Subcategoría *" placeholder="Seleccionar subcategoría..." />
        )}
      />

      <Autocomplete
        options={workOrders.filter((wo) => wo.status !== 'CANCELLED')}
        getOptionLabel={(wo) =>
          `${wo.workOrderNumber} — ${wo.order?.client?.name ?? ''}`
        }
        value={workOrders.find((wo) => wo.id === workOrderId) ?? null}
        onChange={(_, val) => setWorkOrderId(val?.id ?? '')}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Orden de Trabajo (OT)"
            placeholder="Asociar a una OT (opcional)..."
          />
        )}
      />

      <TextField
        label="Área encargada o máquina"
        value={areaOrMachine}
        onChange={(e) => setAreaOrMachine(e.target.value)}
        placeholder="Ej: Impresión, Maquina cortadora..."
        inputProps={{ maxLength: 200 }}
      />
    </Stack>
  );

  const renderStep2 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Datos de Autorización
      </Typography>

      <Autocomplete
        options={users}
        getOptionLabel={(u) =>
          `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
        }
        value={users.find((u) => u.id === authorizedToId) ?? null}
        onChange={(_, val) => setAuthorizedToId(val?.id ?? '')}
        renderInput={(params) => (
          <TextField {...params} label="Se autoriza a *" placeholder="Seleccionar usuario..." />
        )}
      />

      <Autocomplete
        options={users}
        getOptionLabel={(u) =>
          `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
        }
        value={users.find((u) => u.id === responsibleId) ?? null}
        onChange={(_, val) => setResponsibleId(val?.id ?? '')}
        renderInput={(params) => (
          <TextField {...params} label="Responsable (opcional)" placeholder="Seleccionar usuario..." />
        )}
      />

      <TextField
        label="Observaciones generales"
        value={observations}
        onChange={(e) => setObservations(e.target.value)}
        multiline
        rows={4}
        placeholder="Comentarios adicionales sobre esta OG..."
      />
    </Stack>
  );

  const renderStep3 = () => (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={600}>
          Ítems de Gasto
        </Typography>
        <Button startIcon={<AddIcon />} onClick={addItem} variant="outlined" size="small">
          Agregar ítem
        </Button>
      </Stack>

      {items.map((item, index) => (
        <Card key={index} variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={600}>
                  Ítem {index + 1}
                </Typography>
                {items.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => removeItem(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Nombre del gasto *"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  inputProps={{ maxLength: 200 }}
                  sx={{ flex: 2 }}
                />
                <TextField
                  label="Cantidad *"
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  inputProps={{ min: 0.01, step: 0.01 }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Precio unitario *"
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                  inputProps={{ min: 0, step: 100 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  sx={{ flex: 1 }}
                />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Total:{' '}
                <strong>
                  {formatCurrency(
                    (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
                  )}
                </strong>
              </Typography>

              <TextField
                label="Descripción"
                value={item.description}
                onChange={(e) => updateItem(index, 'description', e.target.value)}
                multiline
                rows={2}
                placeholder="Detalle adicional del gasto..."
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Método de pago"
                  value={item.paymentMethod}
                  onChange={(e) =>
                    updateItem(index, 'paymentMethod', e.target.value as PaymentMethod)
                  }
                  sx={{ flex: 1 }}
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Proveedor"
                  value={item.supplierLabel}
                  onChange={(e) => updateItem(index, 'supplierLabel', e.target.value)}
                  placeholder="Nombre del proveedor..."
                  helperText="Ingrese el nombre del proveedor"
                  sx={{ flex: 2 }}
                />
              </Stack>

              {hasWorkOrder && (
                <Autocomplete
                  multiple
                  options={productionAreas.filter((pa) => pa.isActive !== false)}
                  getOptionLabel={(pa) => pa.name}
                  value={productionAreas.filter((pa) =>
                    item.productionAreaIds.includes(pa.id),
                  )}
                  onChange={(_, val) =>
                    updateItem(
                      index,
                      'productionAreaIds',
                      val.map((pa) => pa.id),
                    )
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Áreas de producción"
                      placeholder="Seleccionar áreas..."
                      helperText="Solo disponible cuando hay OT asociada"
                    />
                  )}
                />
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  const renderStep4 = () => (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Resumen de la Orden de Gasto
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Tipo de gasto:</Typography>
              <Typography fontWeight={500}>
                {selectedType?.name} / {subcategories.find((s) => s.id === expenseSubcategoryId)?.name}
              </Typography>
            </Stack>

            {workOrderId && (
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">OT asociada:</Typography>
                <Typography fontWeight={500}>
                  {workOrders.find((wo) => wo.id === workOrderId)?.workOrderNumber ?? workOrderId}
                </Typography>
              </Stack>
            )}

            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Se autoriza a:</Typography>
              <Typography fontWeight={500}>
                {(() => {
                  const u = users.find((u) => u.id === authorizedToId);
                  return u
                    ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
                    : '—';
                })()}
              </Typography>
            </Stack>

            <Divider />

            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Número de ítems:</Typography>
              <Typography fontWeight={500}>{items.length}</Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between">
              <Typography variant="subtitle1" fontWeight={700}>
                Total estimado:
              </Typography>
              <Typography variant="subtitle1" fontWeight={700} color="primary">
                {formatCurrency(totalAmount)}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {!isStep1Valid && (
        <Alert severity="warning">Completa el paso 1: tipo y subcategoría de gasto.</Alert>
      )}
      {!isStep2Valid && (
        <Alert severity="warning">Completa el paso 2: usuario autorizado.</Alert>
      )}
      {!isStep3Valid && (
        <Alert severity="warning">
          Completa el paso 3: todos los ítems deben tener nombre, cantidad y precio unitario.
        </Alert>
      )}

      {isStep1Valid && isStep2Valid && isStep3Valid && (
        <Alert severity="success">Todos los datos están listos para guardar.</Alert>
      )}
    </Stack>
  );

  const canSubmit = isStep1Valid && isStep2Valid && isStep3Valid;

  return (
    <Box>
      <PageHeader
        title={isEditing ? `Editar OG` : 'Nueva Orden de Gasto'}
        subtitle={isEditing ? existingOG?.ogNumber : 'Registro de gasto empresarial'}
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mt: 2 }}>
        {/* Sidebar steps */}
        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
          <Stack spacing={1}>
            {STEPS.map((step, i) => (
              <StepHeader
                key={i}
                index={i}
                config={step}
                status={i === activeStep ? 'active' : i < activeStep ? 'completed' : 'pending'}
                onClick={() => i < activeStep && setActiveStep(i)}
              />
            ))}
          </Stack>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

        {/* Content */}
        <Box flex={1}>
          {activeStep === 0 && renderStep1()}
          {activeStep === 1 && renderStep2()}
          {activeStep === 2 && renderStep3()}
          {activeStep === 3 && renderStep4()}

          {/* Navigation */}
          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mt: 4 }}
          >
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() =>
                activeStep === 0
                  ? navigate(-1)
                  : setActiveStep((prev) => prev - 1)
              }
              disabled={isSubmitting}
            >
              {activeStep === 0 ? 'Cancelar' : 'Anterior'}
            </Button>

            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => setActiveStep((prev) => prev + 1)}
                disabled={
                  (activeStep === 0 && !isStep1Valid) ||
                  (activeStep === 1 && !isStep2Valid) ||
                  (activeStep === 2 && !isStep3Valid)
                }
              >
                Siguiente
              </Button>
            ) : (
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveDraft}
                  disabled={isSubmitting || !canSubmit}
                >
                  Guardar Borrador
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleCreate}
                  disabled={isSubmitting || !canSubmit}
                >
                  {isSubmitting ? <CircularProgress size={20} /> : isEditing ? 'Guardar cambios' : 'Crear OG'}
                </Button>
              </Stack>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default ExpenseOrderFormPage;
