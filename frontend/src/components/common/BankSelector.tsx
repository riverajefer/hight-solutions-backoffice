import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { BANKS } from '../../utils/constants';

interface BankSelectorProps {
  /** Banco de origen seleccionado (nombre) o null si no hay selección. */
  value: string | null | undefined;
  /** Se dispara con el nuevo banco (o null al limpiar). */
  onChange: (value: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

/**
 * Selector de entidad bancaria de origen para pagos por transferencia.
 * Única selección con búsqueda. Las opciones vienen de la constante BANKS.
 * Se muestra solo cuando el método de pago es "Transferencia".
 */
export const BankSelector: React.FC<BankSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  error = false,
  helperText,
  label = 'Banco de origen',
  size = 'medium',
  fullWidth = true,
}) => {
  return (
    <Autocomplete
      options={BANKS}
      value={value ?? null}
      onChange={(_, val) => onChange(val)}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      autoHighlight
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder="Buscar banco..."
          required={required}
          error={error}
          helperText={helperText}
        />
      )}
    />
  );
};

export default BankSelector;
