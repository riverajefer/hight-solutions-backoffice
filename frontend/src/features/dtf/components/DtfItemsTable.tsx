import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Autocomplete,
  MenuItem,
  Select,
  FormControl,
  Typography,
  Stack,
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  Chip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useProducts } from '../../portfolio/products/hooks/useProducts';
import { useClients } from '../../clients/hooks/useClients';
import { formatCurrency } from '../../../utils/formatters';
import { DtfStatusChip } from './DtfStatusChip';
import { CreateClientModal } from '../../orders/components/CreateClientModal';
import type { DtfFormItem } from '../../../types/dtf.types';
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

const emptyItem = (): DtfFormItem => ({
  _localId: uuidv4(),
  productId: '',
  clientId: '',
  quantity: 0,
  notes: '',
  unitPrice: 0,
  value: 0,
  imageFile: null,
  imagePreviewUrl: null,
  comprobanteFile: null,
  comprobantePreviewUrl: null,
});

type FileField = 'image' | 'comprobante';

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
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [clientModalItemId, setClientModalItemId] = useState<string | null>(null);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: '',
    title: '',
  });

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
        if (patch.productId !== undefined || patch.quantity !== undefined) {
          const product = dtfProducts.find((p) => p.id === updated.productId);
          const unitPrice = Number(product?.basePrice ?? 0);
          updated.unitPrice = unitPrice;
          updated.value = unitPrice * (updated.quantity || 0);
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

  const handlePaste = (localId: string, field: FileField, e: React.ClipboardEvent) => {
    const clipItems = e.clipboardData?.items;
    if (!clipItems) return;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.indexOf('image') !== -1) {
        const file = clipItems[i].getAsFile();
        if (file && ALLOWED_IMAGE_TYPES.includes(file.type)) {
          const ext = file.type.split('/')[1] || 'png';
          const named = new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type });
          handleFileSelect(localId, field, named);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const isSaved = (item: DtfFormItem) => !!item.id;

  const isItemSaving = (item: DtfFormItem) => savingItemId === item._localId;

  const canSaveItem = (item: DtfFormItem) =>
    !isSaved(item) && !!item.productId && !!item.clientId && item.quantity > 0;

  const renderUploadCell = (item: DtfFormItem, field: FileField) => {
    const previewUrl = field === 'image' ? item.imagePreviewUrl : item.comprobantePreviewUrl;
    const inputId = `dtf-${field}-${item._localId}`;
    const title = field === 'image' ? 'Imagen de referencia' : 'Comprobante';
    const saved = isSaved(item);

    if (previewUrl) {
      return (
        <Stack spacing={0.5} alignItems="center">
          <Box
            component="img"
            src={previewUrl}
            alt={title}
            onClick={() => setViewDialog({ open: true, url: previewUrl, title })}
            sx={{
              width: 48,
              height: 48,
              objectFit: 'cover',
              borderRadius: 0.5,
              border: '1px solid',
              borderColor: 'grey.300',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.8 },
            }}
          />
          {!saved && (
            <Tooltip title="Quitar">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleFileClear(item._localId, field)}
                disabled={disabled}
              >
                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      );
    }

    if (saved) {
      return (
        <Typography variant="caption" color="text.disabled">
          —
        </Typography>
      );
    }

    return (
      <Box
        tabIndex={0}
        onPaste={(e) => !disabled && handlePaste(item._localId, field, e)}
        onClick={() => { if (!disabled) document.getElementById(inputId)?.click(); }}
        sx={{
          border: '2px dashed',
          borderColor: 'grey.300',
          borderRadius: 1,
          p: 0.75,
          textAlign: 'center',
          cursor: disabled ? 'default' : 'pointer',
          minWidth: 64,
          '&:hover, &:focus': disabled ? {} : { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
      >
        <UploadIcon sx={{ fontSize: 20, color: 'grey.400' }} />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', lineHeight: 1.2, mt: 0.25 }}>
          Subir o pegar
        </Typography>
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

  return (
    <Box>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              <TableCell sx={{ width: 170 }}>Consecutivo</TableCell>
              <TableCell sx={{ minWidth: 160 }}>Producto *</TableCell>
              <TableCell sx={{ minWidth: 90 }} align="center">Imagen ref.</TableCell>
              <TableCell sx={{ minWidth: 220 }}>Cliente *</TableCell>
              <TableCell sx={{ width: 90 }}>Cantidad *</TableCell>
              <TableCell sx={{ minWidth: 130 }} align="right">Valor</TableCell>
              <TableCell sx={{ minWidth: 90 }} align="center">Comprobante</TableCell>
              <TableCell sx={{ minWidth: 160 }}>Notas</TableCell>
              <TableCell sx={{ width: 90 }} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const saved = isSaved(item);
              const saving = isItemSaving(item);
              const productName = dtfProducts.find((p) => p.id === item.productId)?.name ?? '—';
              const clientName = allClients.find((c) => c.id === item.clientId)?.name ?? '—';

              return (
                <TableRow
                  key={item._localId}
                  sx={saved ? { bgcolor: (t) => t.palette.mode === 'light' ? 'success.50' : 'rgba(76,175,80,0.06)' } : {}}
                >
                  {/* Consecutivo */}
                  <TableCell>
                    {saved ? (
                      <Stack spacing={0.5}>
                        <Chip
                          label={item.consecutive}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                        />
                        {item.status && <DtfStatusChip status={item.status} />}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.disabled">Pendiente</Typography>
                    )}
                  </TableCell>

                  {/* Producto */}
                  <TableCell>
                    {saved ? (
                      <Typography variant="body2">{productName}</Typography>
                    ) : (
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
                    )}
                  </TableCell>

                  {/* Imagen ref. */}
                  <TableCell align="center">
                    {renderUploadCell(item, 'image')}
                  </TableCell>

                  {/* Cliente */}
                  <TableCell>
                    {saved ? (
                      <Typography variant="body2">{clientName}</Typography>
                    ) : (
                      <Stack direction="row" spacing={0.5} alignItems="flex-start">
                        <Autocomplete
                          size="small"
                          options={allClients}
                          getOptionLabel={(c) => c.name}
                          value={allClients.find((c) => c.id === item.clientId) ?? null}
                          onChange={(_, client) => updateItem(item._localId, { clientId: client?.id ?? '' })}
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
                              mt: 0.25,
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
                    )}
                  </TableCell>

                  {/* Cantidad */}
                  <TableCell>
                    {saved ? (
                      <Typography variant="body2" textAlign="right">
                        {Number(item.quantity).toLocaleString('es-CO')}
                      </Typography>
                    ) : (
                      <TextField
                        size="small"
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
                        sx={{ width: 80 }}
                        inputProps={{ style: { textAlign: 'right' } }}
                      />
                    )}
                  </TableCell>

                  {/* Valor */}
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>
                      {formatCurrency(item.value)}
                    </Typography>
                    {item.unitPrice > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(item.unitPrice)}/u
                      </Typography>
                    )}
                  </TableCell>

                  {/* Comprobante */}
                  <TableCell align="center">
                    {renderUploadCell(item, 'comprobante')}
                  </TableCell>

                  {/* Notas */}
                  <TableCell>
                    {saved ? (
                      <Typography variant="body2" color={item.notes ? 'text.primary' : 'text.disabled'}>
                        {item.notes || '—'}
                      </Typography>
                    ) : (
                      <TextField
                        size="small"
                        value={item.notes}
                        onChange={(e) => updateItem(item._localId, { notes: e.target.value })}
                        placeholder="Opcional"
                        disabled={disabled || saving}
                        fullWidth
                      />
                    )}
                  </TableCell>

                  {/* Acciones */}
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      {saved ? (
                        <Tooltip title="Ver detalle">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => onViewItem?.(item.id!)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title={canSaveItem(item) ? 'Guardar este registro' : 'Completa producto, cliente y cantidad'}>
                          <span>
                            <IconButton
                              size="small"
                              color="success"
                              disabled={disabled || saving || !canSaveItem(item)}
                              onClick={() => onSaveItem?.(item._localId)}
                            >
                              {saving ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title={saved ? 'Registro guardado' : 'Eliminar fila'}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeItem(item._localId)}
                            disabled={disabled || saving || saved || unsavedCount <= 1}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        startIcon={<AddIcon />}
        onClick={addItem}
        disabled={disabled}
        sx={{ mt: 1 }}
        size="small"
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
    </Box>
  );
};
