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
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { useServices } from '../../portfolio/services/hooks/useServices';
import type { Service } from '../../../types/service.types';

export interface QuoteItemRow {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: number;
  serviceId?: string;
  specifications?: any;
}

interface QuoteItemsTableProps {
  items: QuoteItemRow[];
  onChange: (items: QuoteItemRow[]) => void;
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
}) => {
  const { servicesQuery } = useServices();
  const services: Service[] = servicesQuery.data || [];

  const handleAddRow = () => {
    const newItem: QuoteItemRow = {
      id: uuidv4(),
      description: '',
      quantity: '',
      unitPrice: '',
      total: 0,
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

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

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
              <TableCell width="10%" align="center">Cantidad</TableCell>
              <TableCell width="30%">Servicio (Opcional)</TableCell>
              <TableCell width="30%">Descripción</TableCell>
              <TableCell width="15%" align="right">Valor Unitario</TableCell>
              <TableCell width="10%" align="right">Valor Total</TableCell>
              <TableCell width="5%" align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const itemErrors = errors[`items.${index}`] || {};

              return (
                <TableRow key={item.id} hover>
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
                          const basePriceValue = hasBasePrice ? Number(newValue!.basePrice!) : parseFloat(i.unitPrice);
                          
                          return { 
                            ...i, 
                            serviceId: newValue?.id || undefined,
                            description: i.description || newValue?.name || '',
                            unitPrice: i.unitPrice || (hasBasePrice ? newValue!.basePrice!.toString() : ''),
                            total: !isNaN(quantity) && !isNaN(basePriceValue) ? quantity * basePriceValue : i.total
                          };
                        });
                        onChange(updatedItems);
                      }}
                      disabled={disabled}
                      renderInput={(params) => <TextField {...params} size="small" placeholder="Buscar servicio..." />}
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
              <TableCell colSpan={4} align="right">
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
    </Box>
  );
};
