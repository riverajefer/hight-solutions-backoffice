import React, { useEffect, useState } from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { formatCurrency } from '../../../utils/formatters';
import { PurchaseLineCandidate } from '../../../types';
import { usePurchaseLines } from '../hooks/useSupplyLots';

interface PurchaseLinePickerProps {
  value: PurchaseLineCandidate | null;
  onChange: (line: PurchaseLineCandidate | null) => void;
  helperText?: string;
}

/**
 * Busca la línea de OG con que se compró el rollo (por número de OG o nombre de
 * la línea). Solo ofrece líneas que no estén ya amarradas a otro rollo.
 */
export const PurchaseLinePicker: React.FC<PurchaseLinePickerProps> = ({ value, onChange, helperText }) => {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  // Espera a que el usuario deje de teclear para no buscar en cada letra.
  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const linesQuery = usePurchaseLines(search, open);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={value}
      onChange={(_, v) => onChange(v)}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      options={linesQuery.data ?? []}
      loading={linesQuery.isFetching}
      filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={(o) => `${o.expenseOrder.ogNumber} · ${o.name}`}
      noOptionsText={search ? 'Sin líneas de OG que coincidan' : 'Escribe el número de OG o el nombre de la línea'}
      renderOption={(props, o) => (
        <Box component="li" {...props} key={o.id}>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {o.expenseOrder.ogNumber} · {o.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {o.quantity.toLocaleString('es-CO')} × · {formatCurrency(o.total)}
              {o.description ? ` · ${o.description}` : ''}
            </Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField {...params} label="OG de compra (opcional)" helperText={helperText} />
      )}
    />
  );
};
