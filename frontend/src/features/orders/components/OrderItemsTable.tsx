import React, { useState } from 'react';
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
  Tooltip,
  useMediaQuery,
  useTheme,
  CircularProgress,
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
  Image as ImageIcon,
} from '@mui/icons-material';
import axiosInstance from '../../../api/axios';
import { v4 as uuidv4 } from 'uuid';
import type { OrderItemRow } from '../../../types/order.types';
import { useProductionAreas } from '../../../features/production-areas/hooks/useProductionAreas';
import type { ProductionArea } from '../../../types/production-area.types';
import { useProducts } from '../../portfolio/products/hooks/useProducts';
import type { Product } from '../../../types/product.types';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import { CreateProductModal } from '../../portfolio/products/components/CreateProductModal';

interface OrderItemsTableProps {
  items: OrderItemRow[];
  onChange: (items: OrderItemRow[]) => void;
  errors?: Record<string, any>;
  disabled?: boolean;
  orderId?: string;
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

// Formatear moneda mientras se escribe (con separadores de miles)
const formatCurrencyInput = (value: string): string => {
  // Remover todo excepto números
  const numericValue = value.replace(/\D/g, '');

  if (!numericValue) return '';

  // Convertir a número y formatear con separadores de miles
  const number = parseInt(numericValue, 10);
  return new Intl.NumberFormat('es-CO').format(number);
};


export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
  items,
  onChange,
  errors = {},
  disabled = false,
  // orderId is passed but used by parent for API calls
  onImageUpload,
  onImageDelete,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { productionAreasQuery } = useProductionAreas();
  const productionAreas: ProductionArea[] = productionAreasQuery.data || [];

  const { productsQuery } = useProducts();
  const products: Product[] = productsQuery.data || [];

  const { hasPermission } = useAuthStore();
  const [productModalOpenItemId, setProductModalOpenItemId] = useState<string | null>(null);
  const [viewImageDialog, setViewImageDialog] = React.useState<{ open: boolean; url: string }>({ open: false, url: '' });
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
          handleImageUploadInternal(itemId, newFile);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleImageUploadInternal = async (itemId: string, file: File) => {
    if (!onImageUpload) return;
    setUploadingItemId(itemId);
    try {
      await onImageUpload(itemId, file);
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleImageDeleteInternal = async (itemId: string) => {
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
      const { data } = await axiosInstance.get(`/storage/${sampleImageId}/url`);
      setViewImageDialog({ open: true, url: data.url });
    } catch (error) {
      console.error('Error loading image:', error);
    }
  };

  const showImageColumn = !!onImageUpload || !!onImageDelete || items.some(item => !!item.sampleImageId);

  const handleAddRow = () => {
    const newItem: OrderItemRow = {
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
    // Mantener al menos 1 item
    if (items.length <= 1) {
      return;
    }
    onChange(items.filter((item) => item.id !== id));
  };

  const handleFieldChange = (
    id: string,
    field: keyof OrderItemRow,
    value: string
  ) => {
    const updatedItems = items.map((item) => {
      if (item.id !== id) return item;

      const updatedItem = { ...item, [field]: value };

      // Recalcular total si cambió cantidad o precio
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = parseFloat(
          field === 'quantity' ? value : item.quantity
        );
        const unitPrice = parseFloat(
          field === 'unitPrice' ? value : item.unitPrice
        );

        updatedItem.total =
          !isNaN(quantity) && !isNaN(unitPrice) ? quantity * unitPrice : 0;
      }

      return updatedItem;
    });

    onChange(updatedItems);
  };

  // Calcular subtotal de todos los items
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <Box>
      {productModalOpenItemId !== null && (
        <CreateProductModal
          open
          onClose={() => setProductModalOpenItemId(null)}
          onSuccess={(newProduct) => {
            const updatedItems = items.map((i) => {
              if (i.id !== productModalOpenItemId) return i;
              const quantity = parseFloat(i.quantity);
              const hasBasePrice = newProduct.basePrice !== undefined && newProduct.basePrice !== null;
              const basePriceValue = hasBasePrice ? newProduct.basePrice! : parseFloat(i.unitPrice);
              return {
                ...i,
                productId: newProduct.id,
                description: newProduct.name,
                unitPrice: i.unitPrice || (hasBasePrice ? newProduct.basePrice!.toString() : ''),
                total: !isNaN(quantity) && !isNaN(basePriceValue) ? quantity * basePriceValue : i.total,
              };
            });
            onChange(updatedItems);
            setProductModalOpenItemId(null);
          }}
        />
      )}

      {isMobile && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}
        >
          Desliza horizontalmente para ver todas las columnas →
        </Typography>
      )}
      <TableContainer
        sx={{
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 4,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.3)',
            },
          },
        }}
      >
        <Table size="small" sx={{ minWidth: 750 }}>
          <TableHead>
            <TableRow
              sx={{
                background: 'none !important',
                backgroundImage: 'none !important',

                '& .MuiTableCell-root': {
                  background: 'none !important',
                  backgroundImage: 'none !important',
                  color: '#ffffff !important',
                  fontWeight: 800,
                  fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderBottom: '2px solid',
                  borderBottomColor: (theme) =>
                    theme.palette.mode === 'light' ? '#1a1f23ff' : '#1a1f23ff',
                  padding: { xs: '8px 4px', sm: '10px 8px', md: '10px 8px' },
                },
              }}
            >
              {showImageColumn && <TableCell width="8%" align="center" sx={{ minWidth: 80 }}>Imagen</TableCell>}
              <TableCell
                width={showImageColumn ? "7%" : "8%"}
                align="center"
                sx={{ minWidth: 60 }}
              >
                Cantidad
              </TableCell>
              <TableCell
                width="18%"
                sx={{ minWidth: 120 }}
              >
                Servicio (Opcional)
              </TableCell>
              <TableCell
                width="22%"
                sx={{ minWidth: 140, display: { xs: 'none', sm: 'table-cell' } }}
              >
                Descripción
              </TableCell>
              <TableCell
                width="17%"
                sx={{ minWidth: 130, display: { xs: 'none', sm: 'table-cell' } }}
              >
                Áreas de Producción
              </TableCell>
              <TableCell
                width="17%"
                align="right"
                sx={{ minWidth: 130 }}
              >
                Valor Unitario
              </TableCell>
              <TableCell
                width="13%"
                align="right"
                sx={{ minWidth: 100 }}
              >
                Valor Total
              </TableCell>
              <TableCell
                width="5%"
                align="center"
                sx={{ minWidth: 50 }}
              >
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const itemErrors = errors[`items.${index}`] || {};

              return (
                <TableRow 
                  key={item.id} 
                  hover
                  sx={{
                    '&:nth-of-type(even)': {
                      backgroundColor: (theme) => 
                        theme.palette.mode === 'light' 
                          ? 'rgba(0, 0, 0, 0.015)' 
                          : 'rgba(255, 255, 255, 0.015)',
                    },
                    '& .MuiTableCell-root': {
                      borderBottom: '1px solid',
                      borderBottomColor: 'divider',
                      paddingY: '8px',
                      paddingX: { xs: '4px', sm: '8px', md: '8px' },
                      fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.8125rem' },
                    },
                  }}
                >
                  {/* Imagen */}
                  {showImageColumn && (
                    <TableCell
                      align="center"
                      onPaste={(e) => !item.sampleImageId && handlePasteForItem(item.id, e)}
                    >
                      {uploadingItemId === item.id ? (
                        <CircularProgress size={20} />
                      ) : item.sampleImageId ? (
                        <Stack spacing={0.5} alignItems="center">
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
                                  onClick={() => handleImageDeleteInternal(item.id)}
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
                              const input = document.getElementById(`order-img-input-${item.id}`);
                              input?.click();
                            }}
                          >
                            <UploadIcon sx={{ fontSize: 20, color: 'grey.400' }} />
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', lineHeight: 1.2, mt: 0.25 }}>
                              Subir o pegar
                            </Typography>
                            <input
                              id={`order-img-input-${item.id}`}
                              type="file"
                              hidden
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUploadInternal(item.id, file);
                                e.target.value = '';
                              }}
                            />
                          </Box>
                        )
                      )}
                    </TableCell>
                  )}

                  {/* Cantidad */}
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleFieldChange(item.id, 'quantity', e.target.value)
                      }
                      error={!!itemErrors.quantity}
                      disabled={disabled}
                      inputProps={{
                        min: 0,
                        step: 1,
                        style: { textAlign: 'center', fontSize: '0.8125rem' },
                      }}
                      placeholder="0"
                    />
                  </TableCell>

                  {/* Producto */}
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="flex-start">
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
                            const basePriceValue = hasBasePrice ? newValue!.basePrice! : parseFloat(i.unitPrice);

                            return {
                              ...i,
                              productId: newValue?.id || undefined,
                              description: newValue?.name || '',
                              unitPrice: i.unitPrice || (hasBasePrice ? newValue!.basePrice!.toString() : ''),
                              total: !isNaN(quantity) && !isNaN(basePriceValue) ? quantity * basePriceValue : i.total
                            };
                          });
                          onChange(updatedItems);
                        }}
                        disabled={disabled}
                        slotProps={{
                          paper: {
                            sx: {
                              width: 'max-content',
                              minWidth: '100%',
                              maxWidth: '90vw'
                            }
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder="Buscar servicio..."
                            InputProps={{
                              ...params.InputProps,
                              style: { fontSize: '0.8125rem' }
                            }}
                          />
                        )}
                        noOptionsText="Sin servicios"
                        sx={{ flex: 1, minWidth: 0 }}
                      />
                      {!disabled && hasPermission(PERMISSIONS.CREATE_PRODUCTS) && (
                        <Tooltip title="Crear nuevo producto">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setProductModalOpenItemId(item.id)}
                            sx={{ mt: 0.25, flexShrink: 0 }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>

                  {/* Descripción */}
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={item.description}
                      onChange={(e) =>
                        handleFieldChange(
                          item.id,
                          'description',
                          e.target.value
                        )
                      }
                      error={!!itemErrors.description}
                      disabled={disabled}
                      placeholder="Descripción..."
                      multiline
                      maxRows={2}
                      inputProps={{
                        style: { fontSize: '0.8125rem' },
                      }}
                    />
                  </TableCell>

                  {/* Áreas de Producción */}
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
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
                      slotProps={{
                        paper: {
                          sx: {
                            width: 'max-content',
                            minWidth: '100%',
                            maxWidth: '90vw'
                          }
                        }
                      }}
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

                  {/* Precio Unitario */}
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
                        startAdornment: <Typography sx={{ mr: 0.5, fontSize: '0.8125rem', color: 'text.secondary' }}>$</Typography>,
                      }}
                      inputProps={{
                        style: { textAlign: 'right', fontSize: '0.8125rem' },
                      }}
                      placeholder="0"
                    />
                  </TableCell>

                  {/* Total */}
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      fontSize="0.8125rem"
                      color={item.total > 0 ? 'text.primary' : 'text.disabled'}
                    >
                      {formatCurrency(item.total)}
                    </Typography>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveRow(item.id)}
                      disabled={disabled || items.length <= 1}
                      title={
                        items.length <= 1
                          ? 'Debe haber al menos un item'
                          : 'Eliminar item'
                      }
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Fila de Subtotal */}
            <TableRow
              sx={{
                backgroundColor: (theme) =>
                  theme.palette.mode === 'light'
                    ? theme.palette.grey[100]
                    : theme.palette.grey[900],
                '& .MuiTableCell-root': {
                  borderTop: '1px solid',
                  borderTopColor: 'divider',
                  paddingY: 1.5,
                },
              }}
            >
              <TableCell colSpan={showImageColumn ? 6 : 5} align="right">
                <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Subtotal:
                </Typography>
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

      {/* Botón Agregar Línea */}
      <Stack direction="row" justifyContent="flex-start" sx={{ mt: 2.5 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddRow}
          size="small"
          disabled={disabled}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 2,
            borderStyle: 'dashed',
            '&:hover': {
              borderStyle: 'solid',
            }
          }}
        >
          Agregar Ítem
        </Button>
      </Stack>

      {/* Error general de items */}
      {errors.items?.message && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
          {errors.items.message as string}
        </Typography>
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={viewImageDialog.open}
        onClose={() => setViewImageDialog({ open: false, url: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Imagen de Muestra
          <IconButton onClick={() => setViewImageDialog({ open: false, url: '' })}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewImageDialog.url && (
            <Box
              component="img"
              src={viewImageDialog.url}
              alt="Imagen de muestra"
              sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
