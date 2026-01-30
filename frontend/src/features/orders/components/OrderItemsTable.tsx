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
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import type { OrderItemRow } from '../../../types/order.types';

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
  const handleAddRow = () => {
    const newItem: OrderItemRow = {
      id: uuidv4(),
      description: '',
      quantity: '',
      unitPrice: '',
      total: 0,
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
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width="15%" align="center">
                <Typography variant="subtitle2" fontWeight={600}>
                  Cantidad
                </Typography>
              </TableCell>
              <TableCell width="40%">
                <Typography variant="subtitle2" fontWeight={600}>
                  Descripción
                </Typography>
              </TableCell>
              <TableCell width="20%" align="right">
                <Typography variant="subtitle2" fontWeight={600}>
                  Valor Unitario
                </Typography>
              </TableCell>
              <TableCell width="20%" align="right">
                <Typography variant="subtitle2" fontWeight={600}>
                  Valor Total
                </Typography>
              </TableCell>
              <TableCell width="5%" align="center">
                <Typography variant="subtitle2" fontWeight={600}>
                  Acciones
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const itemErrors = errors[`items.${index}`] || {};

              return (
                <TableRow key={item.id} hover>
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
                        style: { textAlign: 'center' },
                      }}
                      placeholder="0"
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
                      placeholder="Descripción del producto o servicio"
                      multiline
                      maxRows={2}
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
                        startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography>,
                      }}
                      inputProps={{
                        style: { textAlign: 'right' },
                      }}
                      placeholder="0"
                    />
                  </TableCell>

                  {/* Total */}
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={500}
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
            <TableRow>
              <TableCell colSpan={3} align="right">
                <Typography variant="subtitle1" fontWeight={600}>
                  Subtotal:
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle1" fontWeight={700}>
                  {formatCurrency(subtotal)}
                </Typography>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Botón Agregar Línea */}
      <Stack direction="row" justifyContent="flex-start" sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddRow}
          size="medium"
          disabled={disabled}
        >
          Agregar Línea
        </Button>
      </Stack>

      {/* Error general de items */}
      {errors.items && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
          {errors.items}
        </Typography>
      )}
    </Box>
  );
};
