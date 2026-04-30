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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  CloudUpload as UploadIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useProducts } from '../../portfolio/products/hooks/useProducts';
import { useClients } from '../../clients/hooks/useClients';
import { formatCurrency } from '../../../utils/formatters';
import type { DtfFormItem } from '../../../types/dtf.types';
import type { Client } from '../../../types/client.types';
import type { Product } from '../../../types/product.types';

interface DtfItemsTableProps {
  items: DtfFormItem[];
  onChange: (items: DtfFormItem[]) => void;
  disabled?: boolean;
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

export const DtfItemsTable = ({ items, onChange, disabled }: DtfItemsTableProps) => {
  const { productsQuery } = useProducts();
  const { clientsQuery } = useClients();
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [viewDialog, setViewDialog] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: '',
    title: '',
  });

  const allProducts: Product[] = productsQuery.data ?? [];
  const dtfProducts = allProducts.filter((p) =>
    p.name.toLowerCase().includes('dtf'),
  );
  const allClients: Client[] = (clientsQuery.data as Client[]) ?? [];

  const addItem = () => {
    onChange([...items, emptyItem()]);
  };

  const removeItem = (localId: string) => {
    if (items.length === 1) return;
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
    if (field === 'image') {
      updateItem(localId, { imageFile: file, imagePreviewUrl: previewUrl });
    } else {
      updateItem(localId, { comprobanteFile: file, comprobantePreviewUrl: previewUrl });
    }
  };

  const handleFileClear = (localId: string, field: FileField) => {
    if (field === 'image') {
      updateItem(localId, { imageFile: null, imagePreviewUrl: null });
    } else {
      updateItem(localId, { comprobanteFile: null, comprobantePreviewUrl: null });
    }
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

  const renderUploadCell = (item: DtfFormItem, field: FileField) => {
    const previewUrl = field === 'image' ? item.imagePreviewUrl : item.comprobantePreviewUrl;
    const inputId = `dtf-${field}-${item._localId}`;
    const title = field === 'image' ? 'Imagen de referencia' : 'Comprobante';

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
          <Stack direction="row" spacing={0} justifyContent="center">
            <Tooltip title="Ver">
              <IconButton
                size="small"
                onClick={() => setViewDialog({ open: true, url: previewUrl, title })}
              >
                <VisibilityIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Quitar">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleFileClear(item._localId, field)}
                disabled={disabled}
              >
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      );
    }

    return (
      <Box
        tabIndex={0}
        onPaste={(e) => !disabled && handlePaste(item._localId, field, e)}
        onClick={() => {
          if (!disabled) document.getElementById(inputId)?.click();
        }}
        sx={{
          border: '2px dashed',
          borderColor: 'grey.300',
          borderRadius: 1,
          p: 0.75,
          textAlign: 'center',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'border-color 0.2s, background-color 0.2s',
          minWidth: 64,
          '&:hover, &:focus': disabled
            ? {}
            : { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
      >
        <UploadIcon sx={{ fontSize: 20, color: 'grey.400' }} />
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ fontSize: '0.65rem', lineHeight: 1.2, mt: 0.25 }}
        >
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

  return (
    <Box>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              <TableCell sx={{ minWidth: 160 }}>Producto *</TableCell>
              <TableCell sx={{ minWidth: 90 }} align="center">Imagen ref.</TableCell>
              <TableCell sx={{ minWidth: 220 }}>Cliente *</TableCell>
              <TableCell sx={{ width: 90 }}>Cantidad *</TableCell>
              <TableCell sx={{ minWidth: 130 }} align="right">Valor</TableCell>
              <TableCell sx={{ minWidth: 90 }} align="center">Comprobante</TableCell>
              <TableCell sx={{ minWidth: 180 }}>Notas</TableCell>
              <TableCell padding="checkbox" />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item._localId}>
                <TableCell>
                  <FormControl fullWidth size="small">
                    <Select
                      value={item.productId}
                      onChange={(e) =>
                        updateItem(item._localId, { productId: e.target.value })
                      }
                      displayEmpty
                      disabled={disabled}
                    >
                      <MenuItem value="" disabled>
                        Seleccionar...
                      </MenuItem>
                      {dtfProducts.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>

                <TableCell align="center">
                  {renderUploadCell(item, 'image')}
                </TableCell>

                <TableCell>
                  <Autocomplete
                    size="small"
                    options={allClients}
                    getOptionLabel={(c) => c.name}
                    value={allClients.find((c) => c.id === item.clientId) ?? null}
                    onChange={(_, client) =>
                      updateItem(item._localId, { clientId: client?.id ?? '' })
                    }
                    disabled={disabled}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Buscar cliente..." />
                    )}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                  />
                </TableCell>

                <TableCell>
                  <TextField
                    size="small"
                    type="text"
                    inputMode="decimal"
                    value={
                      quantityInputs[item._localId] !== undefined
                        ? quantityInputs[item._localId]
                        : item.quantity > 0
                        ? String(item.quantity)
                        : ''
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
                    disabled={disabled}
                    sx={{ width: 80 }}
                    inputProps={{ style: { textAlign: 'right' } }}
                  />
                </TableCell>

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

                <TableCell align="center">
                  {renderUploadCell(item, 'comprobante')}
                </TableCell>

                <TableCell>
                  <TextField
                    size="small"
                    value={item.notes}
                    onChange={(e) =>
                      updateItem(item._localId, { notes: e.target.value })
                    }
                    placeholder="Opcional"
                    disabled={disabled}
                    fullWidth
                  />
                </TableCell>

                <TableCell padding="checkbox">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeItem(item._localId)}
                    disabled={disabled || items.length === 1}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
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
