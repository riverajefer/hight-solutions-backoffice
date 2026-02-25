import { useState, useEffect, useMemo, useRef } from 'react';
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
  Chip,
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
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import { useExpenseOrders, useExpenseOrder, useExpenseTypes } from '../hooks';
import { useUsers } from '../../users/hooks/useUsers';
import { useWorkOrders } from '../../work-orders/hooks';
import { useProductionAreas } from '../../production-areas/hooks/useProductionAreas';
import { useSuppliers } from '../../suppliers/hooks/useSuppliers';
import { storageApi } from '../../../api/storage.api';
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
  status: 'active' | 'completed' | 'visited' | 'pending';
  clickable?: boolean;
  onClick?: () => void;
}

const StepHeader: React.FC<StepHeaderProps> = ({ index, config, status, clickable, onClick }) => {
  const theme = useTheme();
  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isVisited = status === 'visited';

  const successGreen = theme.palette.success.dark; // #10B981 — verde real del tema

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

// ─── Main Component ───────────────────────────────────────────────────────────

export const ExpenseOrderFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [activeStep, setActiveStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

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
  // receiptFiles[i] holds the File selected for items[i] (not yet uploaded)
  const [receiptFiles, setReceiptFiles] = useState<(File | null)[]>([null]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ─── Data queries ───────────────────────────────────────────────────────────
  const { data: expenseTypes = [], isLoading: loadingTypes } = useExpenseTypes();
  const { workOrdersQuery } = useWorkOrders({ limit: 100 });
  const workOrders = workOrdersQuery.data?.data ?? [];
  const { usersQuery } = useUsers();
  const users = usersQuery.data ?? [];
  const { productionAreasQuery } = useProductionAreas();
  const productionAreas = productionAreasQuery.data ?? [];
  const { suppliersQuery } = useSuppliers();
  const suppliers = suppliersQuery.data ?? [];

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
        // Initialize receiptFiles array with nulls (no new files selected yet)
        setReceiptFiles(existingOG.items.map(() => null));
      }
      // En edición, todos los pasos ya fueron completados previamente
      setVisitedSteps(new Set([0, 1, 2, 3]));
    }
  }, [existingOG]);

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const { createExpenseOrderMutation } = useExpenseOrders();
  const { updateExpenseOrderMutation } = useExpenseOrder(id);

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const selectedType = expenseTypes.find((t) => t.id === expenseTypeId);
  const subcategories = selectedType?.subcategories ?? [];
  const isProduccionType = selectedType?.name?.toLowerCase() === 'producción';
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

  const formatCurrencyInput = (value: string | number): string => {
    const str = typeof value === 'number' ? value.toString() : value;
    const numericValue = str.replace(/\D/g, '');
    if (!numericValue) return '';
    const number = parseInt(numericValue, 10);
    return new Intl.NumberFormat('es-CO').format(number);
  };

  // ─── Item helpers ─────────────────────────────────────────────────────────────
  const addItem = () => {
    setItems((prev) => [...prev, defaultItem()]);
    setReceiptFiles((prev) => [...prev, null]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setReceiptFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ExpenseItemForm, value: unknown) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const setReceiptFileForItem = (index: number, file: File | null) => {
    setReceiptFiles((prev) => prev.map((f, i) => (i === index ? file : f)));
  };

  const clearReceiptForItem = (index: number) => {
    setReceiptFileForItem(index, null);
    // If there was an existing uploaded fileId, clear it too
    updateItem(index, 'receiptFileId', '');
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = '';
    }
  };

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const handleReceiptFileChange = (index: number, file: File | null) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return; // Invalid type — input accept already filters, but double-check
    }
    setReceiptFileForItem(index, file);
    // Clear any previously stored fileId for this item so we know to re-upload
    updateItem(index, 'receiptFileId', '');
  };

  const handlePasteForItem = (index: number, e: React.ClipboardEvent) => {
    const clipItems = e.clipboardData?.items;
    if (!clipItems) return;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.indexOf('image') !== -1) {
        const file = clipItems[i].getAsFile();
        if (file) {
          const extension = file.type.split('/')[1] || 'png';
          const newFile = new File([file], `pasted-image-${Date.now()}.${extension}`, { type: file.type });
          handleReceiptFileChange(index, newFile);
          e.preventDefault();
          break;
        }
      }
    }
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

  /**
   * Upload any pending receipt files and return the resolved receiptFileIds
   * per item (preserving existing fileIds when no new file was chosen).
   */
  const uploadPendingReceipts = async (): Promise<(string | undefined)[]> => {
    return Promise.all(
      items.map(async (item, index) => {
        const file = receiptFiles[index];
        if (file) {
          const uploaded = await storageApi.uploadFile(file, { entityType: 'expense_order' });
          return uploaded.id;
        }
        return item.receiptFileId || undefined;
      }),
    );
  };

  const buildPayload = (resolvedFileIds: (string | undefined)[]): CreateExpenseOrderDto => ({
    expenseTypeId,
    expenseSubcategoryId,
    workOrderId: workOrderId || undefined,
    authorizedToId,
    responsibleId: responsibleId || undefined,
    observations: observations || undefined,
    areaOrMachine: areaOrMachine || undefined,
    items: items.map((item, index) => ({
      quantity: parseFloat(item.quantity),
      name: item.name.trim(),
      description: item.description || undefined,
      supplierId: item.supplierId || undefined,
      unitPrice: parseFloat(item.unitPrice),
      paymentMethod: item.paymentMethod,
      productionAreaIds: hasWorkOrder && item.productionAreaIds.length
        ? item.productionAreaIds
        : undefined,
      receiptFileId: resolvedFileIds[index],
    })) as CreateExpenseItemDto[],
  });

  const handleSaveDraft = async () => {
    const resolvedFileIds = await uploadPendingReceipts();
    const payload = buildPayload(resolvedFileIds);
    if (isEditing) {
      await updateExpenseOrderMutation.mutateAsync({ id: id!, dto: payload as UpdateExpenseOrderDto });
      navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', id!));
    } else {
      const og = await createExpenseOrderMutation.mutateAsync({ dto: payload });
      navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', og.id));
    }
  };

  const handleCreate = async () => {
    const resolvedFileIds = await uploadPendingReceipts();
    const payload = buildPayload(resolvedFileIds);
    if (isEditing) {
      await updateExpenseOrderMutation.mutateAsync({ id: id!, dto: payload as UpdateExpenseOrderDto });
      navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', id!));
    } else {
      const og = await createExpenseOrderMutation.mutateAsync({
        dto: payload,
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
          const newType = val?.name?.toLowerCase();
          setExpenseTypeId(val?.id ?? '');
          setExpenseSubcategoryId('');
          if (newType !== 'producción') {
            setWorkOrderId('');
          }
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

      {isProduccionType && (
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
      )}

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
        <Button startIcon={<AddIcon />} onClick={addItem} variant="outlined" color='primary' size="small">
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
                  value={item.unitPrice ? formatCurrencyInput(item.unitPrice) : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    updateItem(index, 'unitPrice', rawValue);
                  }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ style: { textAlign: 'right' } }}
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

                <Autocomplete
                  options={suppliers.filter((s) => s.isActive !== false)}
                  getOptionLabel={(s) => s.name}
                  value={suppliers.find((s) => s.id === item.supplierId) ?? null}
                  onChange={(_, val) => {
                    updateItem(index, 'supplierId', val?.id ?? '');
                    updateItem(index, 'supplierLabel', val?.name ?? '');
                  }}
                  loading={suppliersQuery.isLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Proveedor"
                      placeholder="Buscar proveedor..."
                    />
                  )}
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

              {/* ── Comprobante de pago ── */}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Comprobante de pago (imagen)
                </Typography>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  hidden
                  ref={(el) => { fileInputRefs.current[index] = el; }}
                  onChange={(e) => handleReceiptFileChange(index, e.target.files?.[0] ?? null)}
                />

                {/* No file selected and no existing fileId */}
                {!receiptFiles[index] && !item.receiptFileId && (
                  <Stack spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<AttachFileIcon />}
                      size="small"
                      onClick={() => fileInputRefs.current[index]?.click()}
                      sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                    >
                      Adjuntar imagen
                    </Button>
                    <Box
                      onPaste={(e) => handlePasteForItem(index, e)}
                      tabIndex={0}
                      sx={{
                        border: '2px dashed',
                        borderColor: 'grey.300',
                        borderRadius: 1,
                        p: 2,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s, background-color 0.2s',
                        '&:hover, &:focus': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 28, color: 'grey.400', mb: 0.5 }} />
                      <Typography variant="caption" color="text.secondary" display="block">
                        O pega una imagen aquí (Ctrl+V / ⌘+V)
                      </Typography>
                    </Box>
                  </Stack>
                )}

                {/* New file selected (pending upload) */}
                {receiptFiles[index] && (
                  <Stack spacing={1.5}>
                    {/* Thumbnail preview */}
                    <Box
                      sx={{
                        position: 'relative',
                        width: 'fit-content',
                        border: '1px solid',
                        borderColor: 'grey.300',
                        borderRadius: 1,
                        overflow: 'hidden',
                        bgcolor: 'grey.50',
                      }}
                    >
                      <Box
                        component="img"
                        src={URL.createObjectURL(receiptFiles[index]!)}
                        alt="Vista previa"
                        sx={{
                          display: 'block',
                          maxWidth: 200,
                          maxHeight: 140,
                          objectFit: 'contain',
                        }}
                        onLoad={(e) => {
                          URL.revokeObjectURL((e.target as HTMLImageElement).src);
                        }}
                      />
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip
                        icon={<ImageIcon />}
                        label={`${receiptFiles[index]!.name} (${(receiptFiles[index]!.size / 1024).toFixed(1)} KB)`}
                        color="primary"
                        variant="outlined"
                        size="small"
                        onDelete={() => clearReceiptForItem(index)}
                        deleteIcon={<CloseIcon />}
                        sx={{ maxWidth: 320 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Se subirá al guardar
                      </Typography>
                    </Stack>
                  </Stack>
                )}

                {/* Existing uploaded file (edit mode, no new file chosen) */}
                {!receiptFiles[index] && item.receiptFileId && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip
                      icon={<ImageIcon />}
                      label="Comprobante adjunto"
                      color="success"
                      variant="outlined"
                      size="small"
                      onDelete={() => clearReceiptForItem(index)}
                      deleteIcon={<CloseIcon />}
                    />
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<AttachFileIcon />}
                      onClick={() => fileInputRefs.current[index]?.click()}
                      sx={{ textTransform: 'none' }}
                    >
                      Cambiar imagen
                    </Button>
                  </Stack>
                )}
              </Box>
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

  // ─── Step navigation ──────────────────────────────────────────────────────────
  const goToStep = (step: number) => {
    setActiveStep(step);
    setVisitedSteps((prev) => new Set([...prev, step]));
  };

  const getStepStatus = (i: number): 'active' | 'completed' | 'visited' | 'pending' => {
    if (i === activeStep) return 'active';
    if (!visitedSteps.has(i)) return 'pending';
    const validByStep = [isStep1Valid, isStep2Valid, isStep3Valid, canSubmit];
    return validByStep[i] ? 'completed' : 'visited';
  };

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
                status={getStepStatus(i)}
                clickable={visitedSteps.has(i) && i !== activeStep}
                onClick={() => goToStep(i)}
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
                  : goToStep(activeStep - 1)
              }
              disabled={isSubmitting}
            >
              {activeStep === 0 ? 'Cancelar' : 'Anterior'}
            </Button>

            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => goToStep(activeStep + 1)}
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
