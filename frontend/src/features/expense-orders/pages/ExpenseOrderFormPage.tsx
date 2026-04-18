import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
  Grid,
  alpha,
  useTheme,
  Dialog,
  DialogContent,
  DialogActions,
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
  TaskAlt as TaskAltIcon,
  ManageAccounts as ManageAccountsIcon,
  AccountBalance as AccountBalanceIcon,
  EastRounded as EastRoundedIcon,
  OpenInNew as OpenInNewIcon,
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
  referenceFileId: string;
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
  referenceFileId: '',
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
  const location = useLocation();
  const isEditing = !!id;

  const [activeStep, setActiveStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  // ─── Post-creation info dialog ──────────────────────────────────────────────
  const [createdOg, setCreatedOg] = useState<{ id: string; ogNumber: string } | null>(null);

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
  // receiptFiles[i] and referenceFiles[i] hold the File selected for items[i] (not yet uploaded)
  const [receiptFiles, setReceiptFiles] = useState<(File | null)[]>([null]);
  const [referenceFiles, setReferenceFiles] = useState<(File | null)[]>([null]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const referenceFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const prefillAppliedRef = useRef(false);

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
            referenceFileId: item.referenceFileId ?? '',
          })),
        );
        // Initialize receiptFiles and referenceFiles arrays with nulls (no new files selected yet)
        setReceiptFiles(existingOG.items.map(() => null));
        setReferenceFiles(existingOG.items.map(() => null));
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

  const normalizeText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  // ─── Prefill desde detalle de OT (solo en creación) ─────────────────────────
  useEffect(() => {
    if (isEditing || prefillAppliedRef.current || expenseTypes.length === 0) {
      return;
    }

    const queryParams = new URLSearchParams(location.search);
    const prefillWorkOrderId = queryParams.get('workOrderId');
    if (!prefillWorkOrderId) {
      prefillAppliedRef.current = true;
      return;
    }

    const productionType = expenseTypes.find(
      (type) => normalizeText(type.name) === 'produccion',
    );

    if (!productionType) {
      prefillAppliedRef.current = true;
      return;
    }

    const directCostSubcategory =
      productionType.subcategories?.find(
        (subcategory) =>
          normalizeText(subcategory.name) ===
          'costos directos de orden de trabajo',
      ) ?? null;

    setExpenseTypeId(productionType.id);
    if (directCostSubcategory) {
      setExpenseSubcategoryId(directCostSubcategory.id);
    }
    setWorkOrderId(prefillWorkOrderId);
    prefillAppliedRef.current = true;
  }, [expenseTypes, isEditing, location.search]);

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
    setReferenceFiles((prev) => [...prev, null]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setReceiptFiles((prev) => prev.filter((_, i) => i !== index));
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ExpenseItemForm, value: unknown) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const setReceiptFileForItem = (index: number, file: File | null) => {
    setReceiptFiles((prev) => prev.map((f, i) => (i === index ? file : f)));
  };

  const clearReceiptForItem = (index: number) => {
    setReceiptFileForItem(index, null);
    updateItem(index, 'receiptFileId', '');
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = '';
    }
  };

  const setReferenceFileForItem = (index: number, file: File | null) => {
    setReferenceFiles((prev) => prev.map((f, i) => (i === index ? file : f)));
  };

  const clearReferenceForItem = (index: number) => {
    setReferenceFileForItem(index, null);
    updateItem(index, 'referenceFileId', '');
    if (referenceFileInputRefs.current[index]) {
      referenceFileInputRefs.current[index]!.value = '';
    }
  };

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const handleReceiptFileChange = (index: number, file: File | null) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return;
    setReceiptFileForItem(index, file);
    updateItem(index, 'receiptFileId', '');
  };

  const handleReferenceFileChange = (index: number, file: File | null) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return;
    setReferenceFileForItem(index, file);
    updateItem(index, 'referenceFileId', '');
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

  const handlePasteReferenceForItem = (index: number, e: React.ClipboardEvent) => {
    const clipItems = e.clipboardData?.items;
    if (!clipItems) return;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.indexOf('image') !== -1) {
        const file = clipItems[i].getAsFile();
        if (file) {
          const extension = file.type.split('/')[1] || 'png';
          const newFile = new File([file], `pasted-image-${Date.now()}.${extension}`, { type: file.type });
          handleReferenceFileChange(index, newFile);
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
   * Upload any pending receipt and reference files, returning resolved IDs per item.
   */
  const uploadPendingFiles = async (): Promise<{
    receiptFileIds: (string | undefined)[];
    referenceFileIds: (string | undefined)[];
  }> => {
    const [receiptFileIds, referenceFileIds] = await Promise.all([
      Promise.all(
        items.map(async (item, index) => {
          const file = receiptFiles[index];
          if (file) {
            const uploaded = await storageApi.uploadFile(file, { entityType: 'expense_order' });
            return uploaded.id;
          }
          return item.receiptFileId || undefined;
        }),
      ),
      Promise.all(
        items.map(async (item, index) => {
          const file = referenceFiles[index];
          if (file) {
            const uploaded = await storageApi.uploadFile(file, { entityType: 'expense_order' });
            return uploaded.id;
          }
          return item.referenceFileId || undefined;
        }),
      ),
    ]);
    return { receiptFileIds, referenceFileIds };
  };

  const buildPayload = (
    resolvedReceiptIds: (string | undefined)[],
    resolvedReferenceIds: (string | undefined)[],
  ): CreateExpenseOrderDto => ({
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
      receiptFileId: resolvedReceiptIds[index],
      referenceFileId: resolvedReferenceIds[index],
    })) as CreateExpenseItemDto[],
  });

  const handleSaveDraft = async () => {
    const { receiptFileIds, referenceFileIds } = await uploadPendingFiles();
    const payload = buildPayload(receiptFileIds, referenceFileIds);
    if (isEditing) {
      await updateExpenseOrderMutation.mutateAsync({ id: id!, dto: payload as UpdateExpenseOrderDto });
      navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', id!));
    } else {
      const og = await createExpenseOrderMutation.mutateAsync({ dto: payload });
      navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', og.id));
    }
  };

  const handleCreate = async () => {
    const { receiptFileIds, referenceFileIds } = await uploadPendingFiles();
    const payload = buildPayload(receiptFileIds, referenceFileIds);
    if (isEditing) {
      await updateExpenseOrderMutation.mutateAsync({ id: id!, dto: payload as UpdateExpenseOrderDto });
      navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', id!));
    } else {
      const og = await createExpenseOrderMutation.mutateAsync({
        dto: payload,
        confirmed: true,
      });
      // Show informational dialog before navigating
      setCreatedOg({ id: og.id, ogNumber: og.ogNumber });
    }
  };

  const handleCreatedDialogClose = () => {
    if (createdOg) {
      navigate(ROUTES.EXPENSE_ORDERS_DETAIL.replace(':id', createdOg.id));
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
          `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u.username || ''
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
          `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u.username || ''
        }
        value={users.find((u) => u.id === responsibleId) ?? null}
        onChange={(_, val) => setResponsibleId(val?.id ?? '')}
        renderInput={(params) => (
          <TextField {...params} label="Responsable (opcional)" placeholder="Seleccionar usuario..." />
        )}
      />

    </Stack>
  );

  const renderStep3 = () => (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={{ xs: 1, sm: 0 }}>
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

              <TextField
                label="Nombre del gasto *"
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                inputProps={{ maxLength: 200 }}
                fullWidth
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
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

                <Box
                  sx={{
                    px: 1.5,
                    py: 0,
                    borderRadius: 1.5,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    minWidth: { xs: '100%', sm: 190 },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                    Total del ítem
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                    {formatCurrency(
                      (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
                    )}
                  </Typography>
                </Box>
              </Stack>

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

              {/* ── Imágenes ── */}
              <Box>
                <Divider sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                    Imágenes
                  </Typography>
                </Divider>
                <Grid container spacing={2}>
                  {/* Comprobante de pago */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                      Comprobante de pago
                    </Typography>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      hidden
                      ref={(el) => { fileInputRefs.current[index] = el; }}
                      onChange={(e) => handleReceiptFileChange(index, e.target.files?.[0] ?? null)}
                    />
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
                            '&:hover, &:focus': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                          }}
                        >
                          <ImageIcon sx={{ fontSize: 28, color: 'grey.400', mb: 0.5 }} />
                          <Typography variant="caption" color="text.secondary" display="block">
                            O pega una imagen aquí (Ctrl+V / ⌘+V)
                          </Typography>
                        </Box>
                      </Stack>
                    )}
                    {receiptFiles[index] && (
                      <Stack spacing={1.5}>
                        <Box sx={{ width: 'fit-content', border: '1px solid', borderColor: 'grey.300', borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.50' }}>
                          <Box
                            component="img"
                            src={URL.createObjectURL(receiptFiles[index]!)}
                            alt="Vista previa comprobante"
                            sx={{ display: 'block', maxWidth: 200, maxHeight: 140, objectFit: 'contain' }}
                            onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
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
                            sx={{ maxWidth: 240 }}
                          />
                          <Typography variant="caption" color="text.secondary">Se subirá al guardar</Typography>
                        </Stack>
                      </Stack>
                    )}
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
                        <Button size="small" variant="text" startIcon={<AttachFileIcon />} onClick={() => fileInputRefs.current[index]?.click()} sx={{ textTransform: 'none' }}>
                          Cambiar imagen
                        </Button>
                      </Stack>
                    )}
                  </Grid>

                  {/* Imagen de referencia */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                      Imagen de referencia
                    </Typography>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      hidden
                      ref={(el) => { referenceFileInputRefs.current[index] = el; }}
                      onChange={(e) => handleReferenceFileChange(index, e.target.files?.[0] ?? null)}
                    />
                    {!referenceFiles[index] && !item.referenceFileId && (
                      <Stack spacing={1}>
                        <Button
                          variant="outlined"
                          startIcon={<AttachFileIcon />}
                          size="small"
                          onClick={() => referenceFileInputRefs.current[index]?.click()}
                          sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                        >
                          Adjuntar imagen
                        </Button>
                        <Box
                          onPaste={(e) => handlePasteReferenceForItem(index, e)}
                          tabIndex={0}
                          sx={{
                            border: '2px dashed',
                            borderColor: 'grey.300',
                            borderRadius: 1,
                            p: 2,
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s, background-color 0.2s',
                            '&:hover, &:focus': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                          }}
                        >
                          <ImageIcon sx={{ fontSize: 28, color: 'grey.400', mb: 0.5 }} />
                          <Typography variant="caption" color="text.secondary" display="block">
                            O pega una imagen aquí (Ctrl+V / ⌘+V)
                          </Typography>
                        </Box>
                      </Stack>
                    )}
                    {referenceFiles[index] && (
                      <Stack spacing={1.5}>
                        <Box sx={{ width: 'fit-content', border: '1px solid', borderColor: 'grey.300', borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.50' }}>
                          <Box
                            component="img"
                            src={URL.createObjectURL(referenceFiles[index]!)}
                            alt="Vista previa referencia"
                            sx={{ display: 'block', maxWidth: 200, maxHeight: 140, objectFit: 'contain' }}
                            onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                          />
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Chip
                            icon={<ImageIcon />}
                            label={`${referenceFiles[index]!.name} (${(referenceFiles[index]!.size / 1024).toFixed(1)} KB)`}
                            color="secondary"
                            variant="outlined"
                            size="small"
                            onDelete={() => clearReferenceForItem(index)}
                            deleteIcon={<CloseIcon />}
                            sx={{ maxWidth: 240 }}
                          />
                          <Typography variant="caption" color="text.secondary">Se subirá al guardar</Typography>
                        </Stack>
                      </Stack>
                    )}
                    {!referenceFiles[index] && item.referenceFileId && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip
                          icon={<ImageIcon />}
                          label="Referencia adjunta"
                          color="secondary"
                          variant="outlined"
                          size="small"
                          onDelete={() => clearReferenceForItem(index)}
                          deleteIcon={<CloseIcon />}
                        />
                        <Button size="small" variant="text" startIcon={<AttachFileIcon />} onClick={() => referenceFileInputRefs.current[index]?.click()} sx={{ textTransform: 'none' }}>
                          Cambiar imagen
                        </Button>
                      </Stack>
                    )}
                  </Grid>
                </Grid>
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

      {/* ── PASOS TOP ── */}
      <Box
        sx={{
          position: 'relative',
          bgcolor: 'background.default',
          pt: 2,
          pb: 1,
          mb: 3,
          mx: { xs: -1, sm: -2, md: -3 }, // Para abarcar todo el margen
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
        {/* Content */}
        <Box flex={1}>
          {activeStep === 0 && renderStep1()}
          {activeStep === 1 && renderStep2()}
          {activeStep === 2 && renderStep3()}
          {activeStep === 3 && renderStep4()}

          {/* Navigation */}
          <Stack
            direction={{ xs: 'column-reverse', sm: 'row' }}
            justifyContent="space-between"
            spacing={{ xs: 1, sm: 0 }}
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
              sx={{ width: { xs: '100%', sm: 'auto' } }}
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
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Siguiente
              </Button>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveDraft}
                  disabled={isSubmitting || !canSubmit}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Guardar Borrador
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleCreate}
                  disabled={isSubmitting || !canSubmit}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {isSubmitting ? <CircularProgress size={20} /> : isEditing ? 'Guardar cambios' : 'Crear OG'}
                </Button>
              </Stack>
            )}
          </Stack>
        </Box>
      </Box>

      {/* ── Post-creation informational dialog ───────────────────────────────── */}
      <Dialog
        open={!!createdOg}
        onClose={handleCreatedDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          },
        }}
      >
        {/* Header con fondo de color */}
        <Box
          sx={{
            background: (t) =>
              `linear-gradient(135deg, ${t.palette.success.dark} 0%, ${t.palette.success.main} 100%)`,
            px: 3,
            pt: 3,
            pb: 2.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              mt: 0.25,
            }}
          >
            <TaskAltIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} color="#fff" lineHeight={1.2}>
              ¡Orden de Gasto creada exitosamente!
            </Typography>
            <Chip
              label={createdOg?.ogNumber ?? ''}
              size="small"
              sx={{
                mt: 0.75,
                bgcolor: 'rgba(255,255,255,0.25)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                letterSpacing: 0.5,
              }}
            />
          </Box>
        </Box>

        <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
          {/* Explicación del estado inicial */}
          <Alert
            severity="info"
            icon={false}
            sx={{
              mb: 2.5,
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.info.main, 0.08),
              border: (t) => `1px solid ${alpha(t.palette.info.main, 0.2)}`,
            }}
          >
            <Typography variant="body2" fontWeight={600} color="info.dark" sx={{ mb: 0.5 }}>
              Estado inicial: <strong>Creada</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
              La OG ha sido registrada en el sistema. Para que el pago se efectúe,
              debe pasar por <strong>dos aprobaciones obligatorias</strong> en el siguiente orden:
            </Typography>
          </Alert>

          {/* Flujo visual de aprobaciones */}
          <Stack spacing={0}>
            {/* Paso 1: Gerencia */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: (t) => alpha(t.palette.warning.main, 0.12),
                  border: (t) => `2px solid ${t.palette.warning.main}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ManageAccountsIcon sx={{ color: 'warning.dark', fontSize: 20 }} />
              </Box>
              <Box flex={1}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                  <Typography variant="caption" fontWeight={700} color="warning.dark"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    1ª Firma — Gerencia / Admin
                  </Typography>
                  <Chip label="Autorizada (Admin)" size="small" color="warning" variant="outlined"
                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                </Stack>
                <Typography variant="body2" color="text.secondary" lineHeight={1.55}>
                  Un administrador revisa que el gasto sea pertinente y lo aprueba.
                  La OG cambia a estado <strong>"Autorizada (Admin)"</strong> pero
                  <strong> el dinero aún no se desembolsa.</strong>
                </Typography>
              </Box>
            </Box>

            {/* Conector */}
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                <EastRoundedIcon sx={{ transform: 'rotate(90deg)', color: 'text.disabled', fontSize: 20 }} />
              </Box>
            </Box>

            {/* Paso 2: Caja */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: (t) => alpha(t.palette.success.main, 0.12),
                  border: (t) => `2px solid ${t.palette.success.main}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AccountBalanceIcon sx={{ color: 'success.dark', fontSize: 20 }} />
              </Box>
              <Box flex={1}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                  <Typography variant="caption" fontWeight={700} color="success.dark"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    2ª Firma — Caja
                  </Typography>
                  <Chip label="Pagada automáticamente" size="small" color="success" variant="outlined"
                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                </Stack>
                <Typography variant="body2" color="text.secondary" lineHeight={1.55}>
                  Caja realiza la aprobación financiera, registra el movimiento de efectivo
                  y la OG pasa <strong>automáticamente a estado "Pagada".</strong>
                </Typography>
              </Box>
            </Box>
          </Stack>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            Puedes consultar el estado de la OG en cualquier momento desde el detalle.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<OpenInNewIcon />}
            onClick={handleCreatedDialogClose}
            fullWidth
            sx={{ borderRadius: 2, py: 1.25, fontWeight: 700 }}
          >
            Entendido — Ver Orden de Gasto
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseOrderFormPage;
