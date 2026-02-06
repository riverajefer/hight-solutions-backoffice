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
  Paper,
  Typography,
  Box,
  Stack,
  Autocomplete,
  Chip,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import type { OrderItemRow } from '../../../types/order.types';
import { useProductionAreas } from '../../../features/production-areas/hooks/useProductionAreas';
import type { ProductionArea } from '../../../types/production-area.types';
import { useServices } from '../../portfolio/services/hooks/useServices';
import type { Service } from '../../../types/service.types';

interface OrderItemsTableProps {
  items: OrderItemRow[];
  onChange: (items: OrderItemRow[]) => void;
  errors?: Record<string, any>;
  disabled?: boolean;
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

// Obtener valor numérico desde string formateado
const parseFormattedCurrency = (value: string): number => {
  const numericValue = value.replace(/\D/g, '');
  return numericValue ? parseInt(numericValue, 10) : 0;
};

export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
  items,
  onChange,
  errors = {},
  disabled = false,
}) => {
  const { productionAreasQuery } = useProductionAreas();
  const productionAreas: ProductionArea[] = productionAreasQuery.data || [];

  const { servicesQuery } = useServices();
  const services: Service[] = servicesQuery.data || [];

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
      <TableContainer>
        <Table size="small">
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
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderBottom: '2px solid',
                  borderBottomColor: (theme) =>
                    theme.palette.mode === 'light' ? '#1a1f23ff' : '#1a1f23ff',
                  padding: '10px 16px',
                },
              }}
            >
              <TableCell width="8%" align="center">
                Cantidad
              </TableCell>
              <TableCell width="25%">
                Servicio (Opcional)
              </TableCell>
              <TableCell width="25%">
                Descripción
              </TableCell>
              <TableCell width="20%">
                Áreas de Producción
              </TableCell>
              <TableCell width="12%" align="right">
                Valor Unitario
              </TableCell>
              <TableCell width="10%" align="right">
                Valor Total
              </TableCell>
              <TableCell width="5%" align="center">
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
                    },
                  }}
                >
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

                  {/* Servicio */}
                  <TableCell>
                    <Autocomplete<Service>
                      size="small"
                      options={services}
                      getOptionLabel={(option) => option.name}
                      value={services.find((s) => s.id === item.serviceId) || null}
                      onChange={(_event, newValue) => {
                        const updatedItems = items.map((i) => {
                          if (i.id !== item.id) return i;
                          
                          const quantity = parseFloat(i.quantity);
                          const hasBasePrice = newValue?.basePrice !== undefined && newValue?.basePrice !== null;
                          const basePriceValue = hasBasePrice ? newValue!.basePrice! : parseFloat(i.unitPrice);
                          
                          return { 
                            ...i, 
                            serviceId: newValue?.id || undefined,
                            description: newValue?.name || '',
                            unitPrice: i.unitPrice || (hasBasePrice ? newValue!.basePrice!.toString() : ''),
                            total: !isNaN(quantity) && !isNaN(basePriceValue) ? quantity * basePriceValue : i.total
                          };
                        });
                        onChange(updatedItems);
                      }}
                      disabled={disabled}
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
                    />
                  </TableCell>

                  {/* Descripción */}
                  <TableCell>
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
              <TableCell colSpan={5} align="right">
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
    </Box>
  );
};
