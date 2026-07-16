import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Autocomplete,
  MenuItem,
  Select,
  FormControl,
  Typography,
  Stack,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  CircularProgress,
  Paper,
  Grid,
  Divider,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import NotesIcon from '@mui/icons-material/Notes';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  WarningAmber as WarningAmberIcon,
  ContentPaste as ContentPasteIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '../../../store/authStore';
import { DtfQuickPreviewModal } from './DtfQuickPreviewModal';
import { useProducts } from '../../portfolio/products/hooks/useProducts';
import { useClients } from '../../clients/hooks/useClients';
import { useDtfDetail } from '../hooks/useDtf';
import { formatCurrency } from '../../../utils/formatters';
import { DtfStatusChip } from './DtfStatusChip';
import { CreateClientModal } from '../../orders/components/CreateClientModal';
import type { DtfFormItem, DtfPaymentMethod } from '../../../types/dtf.types';
import { DTF_PAYMENT_METHOD_LABELS } from '../../../types/dtf.types';
import type { Client } from '../../../types/client.types';
import type { Product } from '../../../types/product.types';

interface DtfItemsTableProps {
  items: DtfFormItem[];
  onChange: (items: DtfFormItem[]) => void;
  disabled?: boolean;
  onSaveItem?: (localId: string) => Promise<void>;
  savingItemId?: string | null;
  onViewItem?: (id: string) => void;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Formatea un valor numérico (como string) a pesos con separador de miles (es-CO)
const formatCurrencyInput = (value: string): string => {
  if (!value) return '';
  const [intPart, decPart] = value.split('.');
  const numericInt = intPart.replace(/\D/g, '');
  if (!numericInt && decPart === undefined) return '';
  const formattedInt = numericInt
    ? new Intl.NumberFormat('es-CO').format(parseInt(numericInt, 10))
    : '0';
  return decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;
};

// Convierte lo que el usuario escribe (miles con punto, coma decimal) al valor `raw`
// con punto decimal, permitiendo un solo separador y hasta 2 decimales.
const parseCurrencyInput = (value: string): string => {
  let raw = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const firstDot = raw.indexOf('.');
  if (firstDot !== -1) {
    const decimals = raw.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
    raw = raw.slice(0, firstDot + 1) + decimals;
  }
  return raw;
};

const emptyItem = (): DtfFormItem => ({
  _localId: uuidv4(),
  productId: '',
  clientId: '',
  quantity: 0,
  notes: '',
  unitPrice: 0,
  value: 0,
  abono: 0,
  abonoPaymentMethod: '',
  abonoNotes: '',
  imageFile: null,
  imagePreviewUrl: null,
  comprobanteFile: null,
  comprobantePreviewUrl: null,
});

type FileField = 'image' | 'comprobante';

function LiveStatusChip({ id }: { id: string }) {
  const { data } = useDtfDetail(id);
  if (!data) return null;
  return <DtfStatusChip status={data.status} />;
}

export const DtfItemsTable = ({
  items,
  onChange,
  disabled,
  onSaveItem,
  savingItemId,
  onViewItem,
}: DtfItemsTableProps) => {
  const { productsQuery } = useProducts();
  const { clientsQuery } = useClients();
  const { user } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const isAdmin = user?.role?.name === 'admin';
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [abonoInputs, setAbonoInputs] = useState<Record<string, string>>({});
  const [unitPriceInputs, setUnitPriceInputs] = useState<Record<string, string>>({});
  const [clientInputValues, setClientInputValues] = useState<Record<string, string>>({});
  const [clientModalItemId, setClientModalItemId] = useState<string | null>(null);
  const [notesModalItemId, setNotesModalItemId] = useState<string | null>(null);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: '',
    title: '',
  });
  const [previewId, setPreviewId] = useState<string | null>(null);

  const allProducts: Product[] = productsQuery.data ?? [];
  const dtfProducts = allProducts.filter((p) => p.name.toLowerCase().includes('dtf'));
  const allClients: Client[] = (clientsQuery.data as Client[]) ?? [];

  const addItem = () => onChange([...items, emptyItem()]);

  const removeItem = (localId: string) => {
    if (items.filter((i) => !i.id).length <= 1 && !items.find((i) => i._localId === localId)?.id) return;
    onChange(items.filter((i) => i._localId !== localId));
  };

  const updateItem = (localId: string, patch: Partial<DtfFormItem>) => {
    onChange(
      items.map((item) => {
        if (item._localId !== localId) return item;
        const updated = { ...item, ...patch };
        if (patch.productId !== undefined) {
          const product = dtfProducts.find((p) => p.id === updated.productId);
          updated.unitPrice = Number(product?.basePrice ?? 0);
          setUnitPriceInputs((prev) => { const n = { ...prev }; delete n[localId]; return n; });
        }
        if (patch.productId !== undefined || patch.quantity !== undefined || patch.unitPrice !== undefined) {
          updated.value = updated.unitPrice * ((updated.quantity || 0) / 100);
        }
        // El comprobante solo aplica a transferencias: si se cambia el método de pago
        // o se anula el abono, se descarta el archivo cargado.
        if (patch.abono !== undefined || patch.abonoPaymentMethod !== undefined) {
          const isTransfer = updated.abono > 0 && updated.abonoPaymentMethod === 'TRANSFER';
          if (!isTransfer) {
            updated.comprobanteFile = null;
            updated.comprobantePreviewUrl = null;
          }
        }
        return updated;
      }),
    );
  };

  const handleFileSelect = (localId: string, field: FileField, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    if (field === 'image') updateItem(localId, { imageFile: file, imagePreviewUrl: previewUrl });
    else updateItem(localId, { comprobanteFile: file, comprobantePreviewUrl: previewUrl });
  };

  const handleFileClear = (localId: string, field: FileField) => {
    if (field === 'image') updateItem(localId, { imageFile: null, imagePreviewUrl: null });
    else updateItem(localId, { comprobanteFile: null, comprobantePreviewUrl: null });
  };

  const fileFromBlob = (blob: Blob): File => {
    const ext = blob.type.split('/')[1] || 'png';
    return new File([blob], `pegado-${Date.now()}.${ext}`, { type: blob.type });
  };

  // Ctrl+V estando el área enfocada
  const handlePaste = (localId: string, field: FileField, e: React.ClipboardEvent) => {
    const clipItems = e.clipboardData?.items;
    if (!clipItems) return;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.indexOf('image') !== -1) {
        const file = clipItems[i].getAsFile();
        if (file && ALLOWED_IMAGE_TYPES.includes(file.type)) {
          handleFileSelect(localId, field, fileFromBlob(file));
          e.preventDefault();
          break;
        }
      }
    }
  };

  // Botón "Pegar": lee el portapapeles directamente, sin depender del foco.
  const handlePasteFromClipboard = async (localId: string, field: FileField) => {
    if (!navigator.clipboard?.read) {
      enqueueSnackbar(
        'Tu navegador no permite leer el portapapeles. Arrastra la imagen o usa Ctrl+V sobre el área.',
        { variant: 'info' },
      );
      return;
    }
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipItem of clipboardItems) {
        const imageType = clipItem.types.find((t) => ALLOWED_IMAGE_TYPES.includes(t));
        if (imageType) {
          const blob = await clipItem.getType(imageType);
          handleFileSelect(localId, field, fileFromBlob(blob));
          return;
        }
      }
      enqueueSnackbar('No hay ninguna imagen en el portapapeles.', { variant: 'warning' });
    } catch {
      enqueueSnackbar(
        'No se pudo leer el portapapeles. Permite el acceso al portapapeles o arrastra la imagen.',
        { variant: 'warning' },
      );
    }
  };

  const handleDrop = (localId: string, field: FileField, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverKey(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      enqueueSnackbar('Formato no admitido. Usa JPG, PNG, GIF o WEBP.', { variant: 'warning' });
      return;
    }
    handleFileSelect(localId, field, file);
  };

  const isSaved = (item: DtfFormItem) => !!item.id;
  const isItemSaving = (item: DtfFormItem) => savingItemId === item._localId;

  // El cliente pertenece a otro asesor → al convertir en OP requerirá autorización.
  // Misma regla que ClientSelector del módulo de Órdenes.
  const getForeignAdvisorName = (clientId: string): string | null => {
    if (isAdmin || !clientId) return null;
    const client = allClients.find((c) => c.id === clientId);
    if (!client?.advisorId || client.advisorId === user?.id) return null;
    return client.advisor?.firstName && client.advisor?.lastName
      ? `${client.advisor.firstName} ${client.advisor.lastName}`
      : client.advisor?.email || 'desconocido';
  };
  const canSaveItem = (item: DtfFormItem) =>
    !isSaved(item) && !!item.productId && !!item.clientId && item.quantity > 0;

  // Zona de carga (imagen o comprobante) para pantalla de creación, tamaño tarjeta.
  // `lockedReason` deshabilita la carga y muestra el motivo (ej. comprobante solo en transferencia).
  const renderDropzone = (item: DtfFormItem, field: FileField, lockedReason?: string) => {
    const previewUrl = field === 'image' ? item.imagePreviewUrl : item.comprobantePreviewUrl;
    const inputId = `dtf-${field}-${item._localId}`;
    const title = field === 'image' ? 'Imagen de referencia' : 'Comprobante';
    const locked = !!lockedReason;
    const uploadDisabled = disabled || locked;

    if (previewUrl) {
      return (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            component="img"
            src={previewUrl}
            alt={title}
            onClick={() => setViewDialog({ open: true, url: previewUrl, title })}
            sx={{
              width: 56,
              height: 56,
              objectFit: 'cover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.300',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.8 },
            }}
          />
          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => handleFileClear(item._localId, field)}
            disabled={disabled}
          >
            Quitar
          </Button>
        </Stack>
      );
    }

    const dragKey = `${item._localId}-${field}`;
    const isDragOver = dragOverKey === dragKey;

    return (
      <Box
        tabIndex={locked ? -1 : 0}
        onPaste={(e) => !uploadDisabled && handlePaste(item._localId, field, e)}
        onClick={() => { if (!uploadDisabled) document.getElementById(inputId)?.click(); }}
        onDragOver={(e) => {
          if (uploadDisabled) return;
          e.preventDefault();
          setDragOverKey(dragKey);
        }}
        onDragLeave={() => setDragOverKey(null)}
        onDrop={(e) => { if (!uploadDisabled) handleDrop(item._localId, field, e); }}
        sx={{
          border: '2px dashed',
          borderColor: isDragOver ? 'primary.main' : 'grey.400',
          bgcolor: isDragOver ? 'action.hover' : 'transparent',
          borderRadius: 1,
          py: 1,
          px: 1,
          textAlign: 'center',
          opacity: locked ? 0.5 : 1,
          cursor: uploadDisabled ? 'default' : 'pointer',
          transition: 'border-color 0.2s, background-color 0.2s, opacity 0.2s',
          '&:hover, &:focus': uploadDisabled ? {} : { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
      >
        <UploadIcon sx={{ fontSize: 20, color: 'grey.500' }} />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.3 }}>
          {lockedReason ?? 'Arrastra o haz clic para buscar'}
        </Typography>
        {!uploadDisabled && (
          <Button
            size="small"
            startIcon={<ContentPasteIcon sx={{ fontSize: '0.9rem !important' }} />}
            onClick={(e) => {
              e.stopPropagation();
              handlePasteFromClipboard(item._localId, field);
            }}
            sx={{ mt: 0.25, py: 0, minHeight: 24, fontSize: '0.7rem' }}
          >
            Pegar
          </Button>
        )}
        <input
          id={inputId}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(item._localId, field, file);
            e.target.value = '';
          }}
        />
      </Box>
    );
  };

  const unsavedCount = items.filter((i) => !i.id).length;
  const notesModalItem = items.find((i) => i._localId === notesModalItemId) ?? null;

  const fieldLabelSx = { fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary', mb: 0.25, display: 'block' } as const;

  // ---- Tarjeta compacta para ítems ya guardados ----
  const renderSavedCard = (item: DtfFormItem) => {
    const productName = dtfProducts.find((p) => p.id === item.productId)?.name ?? '—';
    const clientName = allClients.find((c) => c.id === item.clientId)?.name ?? '—';

    return (
      <Paper
        key={item._localId}
        variant="outlined"
        sx={{
          p: 1.25,
          borderRadius: 2,
          borderColor: 'success.light',
          bgcolor: (t) => (t.palette.mode === 'light' ? 'success.50' : 'rgba(76,175,80,0.06)'),
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            label={item.consecutive}
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
          />
          {item.id && <LiveStatusChip id={item.id} />}
          <Typography variant="body2" fontWeight={500}>
            {productName} · {clientName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Number(item.quantity).toLocaleString('es-CO')} cm · {formatCurrency(item.value)}
          </Typography>
          {item.abono > 0 && (
            <Typography variant="body2" color="success.main" fontWeight={500}>
              Abono {formatCurrency(item.abono)}
            </Typography>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Vista rápida">
            <IconButton size="small" color="info" onClick={() => setPreviewId(item.id!)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ver detalle completo">
            <IconButton size="small" color="primary" onClick={() => onViewItem?.(item.id!)}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>
    );
  };

  // ---- Tarjeta de formulario para ítems sin guardar ----
  const renderFormCard = (item: DtfFormItem, index: number) => {
    const saving = isItemSaving(item);
    const abono = item.abono;
    const foreignAdvisorName = getForeignAdvisorName(item.clientId);

    return (
      <Paper key={item._localId} variant="outlined" sx={{ p: { xs: 1.25, sm: 1.5 }, borderRadius: 2 }}>
        {/* Encabezado */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Ítem {index + 1} — pendiente
          </Typography>
          <Tooltip title="Eliminar ítem">
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={() => removeItem(item._localId)}
                disabled={disabled || saving || unsavedCount <= 1}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {/* Producto + Cliente */}
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <Typography component="label" sx={fieldLabelSx}>Producto *</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={item.productId}
                onChange={(e) => updateItem(item._localId, { productId: e.target.value })}
                displayEmpty
                disabled={disabled || saving}
              >
                <MenuItem value="" disabled>Seleccionar...</MenuItem>
                {dtfProducts.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography component="label" sx={fieldLabelSx}>Cliente *</Typography>
            <Stack direction="row" spacing={0.5} alignItems="flex-start">
              <Autocomplete
                size="small"
                fullWidth
                options={allClients}
                getOptionLabel={(c) => c.name}
                value={allClients.find((c) => c.id === item.clientId) ?? null}
                inputValue={clientInputValues[item._localId] ?? ''}
                onInputChange={(_, newInputValue) => {
                  setClientInputValues((prev) => ({ ...prev, [item._localId]: newInputValue }));
                }}
                onChange={(_, client) => {
                  updateItem(item._localId, { clientId: client?.id ?? '' });
                  setClientInputValues((prev) => ({ ...prev, [item._localId]: '' }));
                }}
                filterOptions={(options, { inputValue: searchInput }) => {
                  const trimmed = searchInput.trim().toLowerCase();
                  if (trimmed.length < 2) return [];
                  const terms = trimmed.split(' ');
                  return options
                    .filter((opt) => {
                      const haystack = [opt.name, opt.nit, opt.phone, opt.email]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                      return terms.every((t) => haystack.includes(t));
                    })
                    .slice(0, 10);
                }}
                disabled={disabled || saving}
                renderInput={(params) => <TextField {...params} placeholder="Buscar cliente..." />}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                sx={{ flex: 1, minWidth: 0 }}
              />
              <Tooltip title="Crear nuevo cliente">
                <IconButton
                  size="small"
                  color="primary"
                  disabled={disabled || saving}
                  onClick={() => setClientModalItemId(item._localId)}
                  sx={{
                    flexShrink: 0,
                    border: '1px dashed',
                    borderColor: 'primary.main',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>

        {/* Cliente de otro asesor → requerirá autorización al convertir en OP */}
        {foreignAdvisorName && (
          <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 1.5, py: 0.25 }}>
            <strong>Cliente de otro asesor.</strong>{' '}
            Este cliente pertenece al asesor {foreignAdvisorName}. Al momento de convertir esta DTF
            en OP requerirá autorización de administración.
          </Alert>
        )}

        {/* Cantidad + Precio + Valor */}
        <Grid container spacing={1.5} sx={{ mt: 0 }} alignItems="flex-end">
          <Grid item xs={6} sm={4}>
            <Typography component="label" sx={fieldLabelSx}>Cantidad (cm) *</Typography>
            <TextField
              size="small"
              fullWidth
              type="text"
              inputMode="decimal"
              value={
                quantityInputs[item._localId] !== undefined
                  ? quantityInputs[item._localId]
                  : item.quantity > 0 ? String(item.quantity) : ''
              }
              onChange={(e) => {
                const raw = e.target.value;
                if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
                setQuantityInputs((prev) => ({ ...prev, [item._localId]: raw }));
                const num = parseFloat(raw);
                if (!isNaN(num)) updateItem(item._localId, { quantity: num });
                else if (raw === '') updateItem(item._localId, { quantity: 0 });
              }}
              onBlur={() =>
                setQuantityInputs((prev) => {
                  const next = { ...prev };
                  delete next[item._localId];
                  return next;
                })
              }
              disabled={disabled || saving}
              InputProps={{ endAdornment: <InputAdornment position="end">cm</InputAdornment> }}
              inputProps={{ style: { textAlign: 'right' } }}
            />
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography component="label" sx={fieldLabelSx}>Precio unit.</Typography>
            <TextField
              size="small"
              fullWidth
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={
                unitPriceInputs[item._localId] !== undefined
                  ? unitPriceInputs[item._localId]
                  : item.unitPrice > 0 ? String(item.unitPrice) : ''
              }
              onChange={(e) => {
                const raw = e.target.value;
                if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
                setUnitPriceInputs((prev) => ({ ...prev, [item._localId]: raw }));
                const num = parseFloat(raw);
                if (!isNaN(num)) updateItem(item._localId, { unitPrice: num });
                else if (raw === '') updateItem(item._localId, { unitPrice: 0 });
              }}
              onBlur={() =>
                setUnitPriceInputs((prev) => { const n = { ...prev }; delete n[item._localId]; return n; })
              }
              disabled={disabled || saving || !item.productId}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                endAdornment: <InputAdornment position="end">/u</InputAdornment>,
              }}
              inputProps={{ style: { textAlign: 'right' } }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'warning.light',
                borderRadius: 1,
                px: 1.5,
                py: 0.5,
              }}
            >
              <Typography variant="caption" color="warning.main">Valor total</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="warning.main" sx={{ lineHeight: 1.2 }}>
                {formatCurrency(item.value)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        {/* Abono + Método + Saldo */}
        <Grid container spacing={1.5} alignItems="flex-start">
          <Grid item xs={12} sm={4}>
            <Typography component="label" sx={fieldLabelSx}>Abono</Typography>
            <TextField
              size="small"
              fullWidth
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={
                abonoInputs[item._localId] !== undefined
                  ? abonoInputs[item._localId]
                  : abono > 0 ? formatCurrencyInput(String(abono)) : ''
              }
              onChange={(e) => {
                const raw = parseCurrencyInput(e.target.value);
                setAbonoInputs((prev) => ({ ...prev, [item._localId]: formatCurrencyInput(raw) }));
                const num = parseFloat(raw);
                updateItem(item._localId, { abono: isNaN(num) ? 0 : num });
              }}
              onBlur={() =>
                setAbonoInputs((prev) => {
                  const next = { ...prev };
                  delete next[item._localId];
                  return next;
                })
              }
              disabled={disabled || saving}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              inputProps={{ style: { textAlign: 'right' } }}
            />
          </Grid>
          {abono > 0 && (
            <Grid item xs={12} sm={4}>
              <Typography component="label" sx={fieldLabelSx}>Método de pago</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={item.abonoPaymentMethod}
                  onChange={(e) =>
                    updateItem(item._localId, { abonoPaymentMethod: e.target.value as DtfPaymentMethod })
                  }
                  displayEmpty
                  disabled={disabled || saving}
                >
                  <MenuItem value="" disabled>Método...</MenuItem>
                  {(Object.entries(DTF_PAYMENT_METHOD_LABELS) as [DtfPaymentMethod, string][]).map(
                    ([method, label]) => (
                      <MenuItem key={method} value={method}>{label}</MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>
            </Grid>
          )}
          {abono > 0 && (
            <Grid item xs={12} sm={4}>
              <Typography component="label" sx={fieldLabelSx}>Saldo</Typography>
              <Typography variant="body1" fontWeight={600} color="success.main" sx={{ mt: 0.75 }}>
                {formatCurrency(item.value - abono)}
              </Typography>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        {/* Imagen + Comprobante */}
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <Typography component="label" sx={fieldLabelSx}>Imagen de referencia</Typography>
            {renderDropzone(item, 'image')}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography component="label" sx={fieldLabelSx}>Comprobante</Typography>
            {renderDropzone(
              item,
              'comprobante',
              abono > 0 && item.abonoPaymentMethod === 'TRANSFER'
                ? undefined
                : 'Solo para transferencia',
            )}
          </Grid>
        </Grid>

        {/* Pie: notas + guardar */}
        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
        >
          <Button
            startIcon={<NotesIcon />}
            onClick={() => setNotesModalItemId(item._localId)}
            disabled={disabled || saving}
            size="small"
            color={item.notes ? 'primary' : 'inherit'}
          >
            {item.notes ? 'Editar notas' : 'Agregar notas'}
          </Button>
          <Tooltip title={canSaveItem(item) ? 'Guardar este registro' : 'Completa producto, cliente y cantidad'}>
            <span>
              <Button
                variant="contained"
                color="success"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                disabled={disabled || saving || !canSaveItem(item)}
                onClick={() => onSaveItem?.(item._localId)}
              >
                Guardar ítem
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Paper>
    );
  };

  return (
    <Box>
      <Stack spacing={1.5}>
        {items.map((item, index) =>
          isSaved(item) ? renderSavedCard(item) : renderFormCard(item, index),
        )}
      </Stack>

      <Button
        startIcon={<AddIcon />}
        onClick={addItem}
        disabled={disabled}
        sx={{ mt: 1.5 }}
        size="small"
        variant="outlined"
      >
        Agregar ítem
      </Button>

      <CreateClientModal
        open={!!clientModalItemId}
        onClose={() => setClientModalItemId(null)}
        onSuccess={(newClient) => {
          if (clientModalItemId) {
            updateItem(clientModalItemId, { clientId: newClient.id });
          }
          setClientModalItemId(null);
        }}
      />

      {/* Modal de notas del ítem */}
      <Dialog
        open={!!notesModalItemId}
        onClose={() => setNotesModalItemId(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Notas del ítem</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            placeholder="Observaciones u opcional"
            value={notesModalItem?.notes ?? ''}
            onChange={(e) => notesModalItemId && updateItem(notesModalItemId, { notes: e.target.value })}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setNotesModalItemId(null)}>
            Listo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, url: '', title: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {viewDialog.title}
          <IconButton onClick={() => setViewDialog({ open: false, url: '', title: '' })}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewDialog.url && (
            <Box
              component="img"
              src={viewDialog.url}
              alt={viewDialog.title}
              sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>

      <DtfQuickPreviewModal
        id={previewId}
        onClose={() => setPreviewId(null)}
      />
    </Box>
  );
};
