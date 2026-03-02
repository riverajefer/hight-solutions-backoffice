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
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Image as ImageIcon,
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
  const [thumbnailUrls, setThumbnailUrls] = React.useState<Record<string, string>>({});

  // Fetch thumbnail URLs for items that have sampleImageId
  React.useEffect(() => {
    const fetchThumbnails = async () => {
      const itemsWithImages = items.filter(
        (item) => item.sampleImageId && !thumbnailUrls[item.sampleImageId]
      );
      if (itemsWithImages.length === 0) return;

      const newUrls: Record<string, string> = {};
      await Promise.all(
        itemsWithImages.map(async (item) => {
          try {
            const { data } = await axiosInstance.get(`/storage/${item.sampleImageId}/url`);
            newUrls[item.sampleImageId!] = data.url;
          } catch {
            // ignore
          }
        })
      );
      if (Object.keys(newUrls).length > 0) {
        setThumbnailUrls((prev) => ({ ...prev, ...newUrls }));
      }
    };
    fetchThumbnails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.sampleImageId).join(',')]);

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const handlePasteForItem = (itemId: string, e: React.ClipboardEvent) => {
    const clipItems = e.clipboardData?.items;
    if (!clipItems || !onImageUpload) return;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.indexOf('image') !== -1) {
        const file = clipItems[i].getAsFile();
        if (file && ALLOWED_IMAGE_TYPES.includes(file.type)) {
          const extension = file.type.split('/')[1] || 'png';
          const newFile = new File([file], `pasted-image-${Date.now()}.${extension}`, { type: file.type });
          handleImageUpload(itemId, newFile);
          e.preventDefault();
          break;
        }
      }
    }
  };

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
                    <TableCell
                      align="center"
                      onPaste={(e) => !item.sampleImageId && handlePasteForItem(item.id, e)}
                    >
                      {uploadingItemId === item.id ? (
                        <CircularProgress size={20} />
                      ) : item.sampleImageId ? (
                        <Stack spacing={0.5} alignItems="center">
                          {/* Thumbnail */}
                          {thumbnailUrls[item.sampleImageId] ? (
                            <Box
                              component="img"
                              src={thumbnailUrls[item.sampleImageId]}
                              alt="Muestra"
                              onClick={() => handleViewImage(item.sampleImageId!)}
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
                          ) : (
                            <Box
                              onClick={() => handleViewImage(item.sampleImageId!)}
                              sx={{
                                width: 48,
                                height: 48,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 0.5,
                                border: '1px solid',
                                borderColor: 'grey.300',
                                bgcolor: 'grey.50',
                                cursor: 'pointer',
                              }}
                            >
                              <ImageIcon fontSize="small" color="disabled" />
                            </Box>
                          )}
                          <Stack direction="row" spacing={0} justifyContent="center">
                            <Tooltip title="Ver imagen">
                              <IconButton
                                size="small"
                                onClick={() => handleViewImage(item.sampleImageId!)}
                              >
                                <VisibilityIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            {onImageDelete && (
                              <Tooltip title="Eliminar imagen">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleImageDelete(item.id)}
                                  disabled={disabled}
                                >
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </Stack>
                      ) : (
                        onImageUpload && (
                          <Box
                            tabIndex={0}
                            onPaste={(e) => handlePasteForItem(item.id, e)}
                            sx={{
                              border: '2px dashed',
                              borderColor: 'grey.300',
                              borderRadius: 1,
                              p: 0.75,
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'border-color 0.2s, background-color 0.2s',
                              minWidth: 64,
                              '&:hover, &:focus': {
                                borderColor: 'primary.main',
                                bgcolor: 'action.hover',
                              },
                            }}
                            onClick={() => {
                              // Trigger file input via the hidden input
                              const input = document.getElementById(`quote-img-input-${item.id}`);
                              input?.click();
                            }}
                          >
                            <UploadIcon sx={{ fontSize: 20, color: 'grey.400' }} />
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', lineHeight: 1.2, mt: 0.25 }}>
                              Subir o pegar
                            </Typography>
                            <input
                              id={`quote-img-input-${item.id}`}
                              type="file"
                              hidden
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(item.id, file);
                                e.target.value = '';
                              }}
                            />
                          </Box>
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
