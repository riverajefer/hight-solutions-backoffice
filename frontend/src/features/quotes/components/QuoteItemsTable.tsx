import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Button,
  Typography,
  Box,
  Stack,
  Autocomplete,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { useProducts } from '../../portfolio/products/hooks/useProducts';
import type { Product } from '../../../types/product.types';
import { useProductionAreas } from '../../production-areas/hooks/useProductionAreas';
import type { ProductionArea } from '../../../types/production-area.types';
import axiosInstance from '../../../api/axios';

export interface QuoteItemRow {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: number;
  productId?: string;
  specifications?: any;
  productionAreaIds?: string[];
  sampleImageId?: string;
}

interface QuoteItemsTableProps {
  items: QuoteItemRow[];
  onChange: (items: QuoteItemRow[]) => void;
  errors?: Record<string, any>;
  disabled?: boolean;
  quoteId?: string; // For uploading images on existing quotes
  onImageUpload?: (itemId: string, file: File) => Promise<void>;
  onImageDelete?: (itemId: string) => Promise<void>;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyInput = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  const number = parseInt(numericValue, 10);
  return new Intl.NumberFormat('es-CO').format(number);
};

export const QuoteItemsTable: React.FC<QuoteItemsTableProps> = ({
  items,
  onChange,
  errors = {},
  disabled = false,
  quoteId,
  onImageUpload,
  onImageDelete,
}) => {
  const { productsQuery } = useProducts();
  const products: Product[] = productsQuery.data || [];

  const { productionAreasQuery } = useProductionAreas();
  const productionAreas: ProductionArea[] = productionAreasQuery.data || [];

  const [viewImageDialog, setViewImageDialog] = React.useState<{
    open: boolean;
    url: string;
  }>({ open: false, url: '' });

  const [uploadingItemId, setUploadingItemId] = React.useState<string | null>(null);

  const handleAddRow = () => {
    const newItem: QuoteItemRow = {
      id: uuidv4(),
      description: '',
      quantity: '',
      unitPrice: '',
      total: 0,
      productionAreaIds: [],
    };
    onChange([...items, newItem]);
  };

  const handleRemoveRow = (id: string) => {
    if (items.length <= 1) return;
    onChange(items.filter((item) => item.id !== id));
  };

  const handleFieldChange = (
    id: string,
    field: keyof QuoteItemRow,
    value: string
  ) => {
    const updatedItems = items.map((item) => {
      if (item.id !== id) return item;

      const updatedItem = { ...item, [field]: value };

      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = parseFloat(field === 'quantity' ? value : item.quantity);
        const unitPrice = parseFloat(field === 'unitPrice' ? value : item.unitPrice);
        updatedItem.total = !isNaN(quantity) && !isNaN(unitPrice) ? quantity * unitPrice : 0;
      }

      return updatedItem;
    });

    onChange(updatedItems);
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    if (!onImageUpload) return;
    setUploadingItemId(itemId);
    try {
      await onImageUpload(itemId, file);
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleImageDelete = async (itemId: string) => {
    if (!onImageDelete) return;
    setUploadingItemId(itemId);
    try {
      await onImageDelete(itemId);
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleViewImage = async (sampleImageId: string) => {
    try {
      // Get signed URL from storage API using axiosInstance (handles auth automatically)
      const { data } = await axiosInstance.get(`/storage/${sampleImageId}/url`);
      setViewImageDialog({ open: true, url: data.url });
    } catch (error) {
      console.error('Error loading image:', error);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  const showImageColumn = !!onImageUpload || !!onImageDelete || items.some(item => !!item.sampleImageId);

  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                background: 'none !important',
                '& .MuiTableCell-root': {
                  color: (theme) => theme.palette.mode === 'light' ? '#333' : '#fff',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  borderBottom: '2px solid divider',
                  padding: '10px 16px',
                },
              }}
            >
              {showImageColumn && <TableCell width="8%" align="center">Imagen</TableCell>}
              <TableCell width={showImageColumn ? "7%" : "8%"} align="center">Cantidad</TableCell>
              <TableCell width={showImageColumn ? "22%" : "25%"}>Servicio (Opcional)</TableCell>
              <TableCell width={showImageColumn ? "22%" : "25%"}>Descripción</TableCell>
              <TableCell width={showImageColumn ? "15%" : "17%"}>Áreas de Producción</TableCell>
              <TableCell width={showImageColumn ? "11%" : "12%"} align="right">Valor Unitario</TableCell>
              <TableCell width={showImageColumn ? "10%" : "8%"} align="right">Valor Total</TableCell>
              <TableCell width="5%" align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const itemErrors = errors[`items.${index}`] || {};

              return (
                <TableRow key={item.id} hover>
                  {showImageColumn && (
                    <TableCell align="center">
                      {item.sampleImageId ? (
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <IconButton
                            size="small"
                            onClick={() => handleViewImage(item.sampleImageId!)}
                            disabled={uploadingItemId === item.id}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          {onImageDelete && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleImageDelete(item.id)}
                              disabled={disabled || uploadingItemId === item.id}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      ) : (
                        onImageUpload && (
                          <IconButton
                            size="small"
                            component="label"
                            disabled={disabled || uploadingItemId === item.id}
                          >
                            <UploadIcon fontSize="small" />
                            <input
                              type="file"
                              hidden
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(item.id, file);
                                }
                              }}
                            />
                          </IconButton>
                        )
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleFieldChange(item.id, 'quantity', e.target.value)}
                      error={!!itemErrors.quantity}
                      disabled={disabled}
                      inputProps={{ min: 0, style: { textAlign: 'center', fontSize: '0.8125rem' } }}
                    />
                  </TableCell>
                  <TableCell>
                    <Autocomplete<Product>
                      size="small"
                      options={products}
                      getOptionLabel={(option) => option.name}
                      value={products.find((s) => s.id === item.productId) || null}
                      onChange={(_event, newValue) => {
                        const updatedItems = items.map((i) => {
                          if (i.id !== item.id) return i;
                          const quantity = parseFloat(i.quantity);
                          const hasBasePrice = newValue?.basePrice !== undefined && newValue?.basePrice !== null;
                          const basePriceValue = hasBasePrice ? Number(newValue!.basePrice!) : parseFloat(i.unitPrice);

                          return {
                            ...i,
                            productId: newValue?.id || undefined,
                            description: i.description || newValue?.name || '',
                            unitPrice: i.unitPrice || (hasBasePrice ? newValue!.basePrice!.toString() : ''),
                            total: !isNaN(quantity) && !isNaN(basePriceValue) ? quantity * basePriceValue : i.total
                          };
                        });
                        onChange(updatedItems);
                      }}
                      disabled={disabled}
                      renderInput={(params) => <TextField {...params} size="small" placeholder="Buscar producto..." />}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      value={item.description}
                      onChange={(e) => handleFieldChange(item.id, 'description', e.target.value)}
                      error={!!itemErrors.description}
                      disabled={disabled}
                      multiline
                      maxRows={2}
                    />
                  </TableCell>
                  <TableCell>
                    <Autocomplete<ProductionArea, true>
                      multiple
                      size="small"
                      options={productionAreas}
                      getOptionLabel={(option) => option.name}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      value={productionAreas.filter((area) =>
                        item.productionAreaIds?.includes(area.id)
                      )}
                      onChange={(_event, newValue) => {
                        const updatedItems = items.map((i) =>
                          i.id === item.id
                            ? { ...i, productionAreaIds: newValue.map((v) => v.id) }
                            : i
                        );
                        onChange(updatedItems);
                      }}
                      disabled={disabled}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={option.name}
                            size="small"
                            {...getTagProps({ index })}
                            key={option.id}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder={
                            item.productionAreaIds?.length === 0
                              ? 'Áreas...'
                              : undefined
                          }
                          InputProps={{
                            ...params.InputProps,
                            style: { fontSize: '0.8125rem' }
                          }}
                        />
                      )}
                      noOptionsText="No hay áreas disponibles"
                      ListboxProps={{ style: { maxHeight: 150 } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      value={item.unitPrice ? formatCurrencyInput(item.unitPrice) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        handleFieldChange(item.id, 'unitPrice', rawValue);
                      }}
                      error={!!itemErrors.unitPrice}
                      disabled={disabled}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 0.5, fontSize: '0.8125rem' }}>$</Typography>,
                      }}
                      inputProps={{ style: { textAlign: 'right' } }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(item.total)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveRow(item.id)}
                      disabled={disabled || items.length <= 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              <TableCell colSpan={showImageColumn ? 6 : 5} align="right">
                <Typography variant="body2" fontWeight={700}>SUBTOTAL:</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2" fontWeight={800} color="primary">
                  {formatCurrency(subtotal)}
                </Typography>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Stack direction="row" sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddRow}
          size="small"
          disabled={disabled}
          sx={{ borderStyle: 'dashed' }}
        >
          Agregar Ítem
        </Button>
      </Stack>

      {/* View Image Dialog */}
      <Dialog
        open={viewImageDialog.open}
        onClose={() => setViewImageDialog({ open: false, url: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Imagen de Muestra
          <IconButton
            onClick={() => setViewImageDialog({ open: false, url: '' })}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            component="img"
            src={viewImageDialog.url}
            alt="Muestra"
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: '70vh',
              objectFit: 'contain',
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
