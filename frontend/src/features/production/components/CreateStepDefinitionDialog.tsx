import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  InputAdornment,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import type { CreateStepDefinitionDto } from '../../../types/production.types';

interface CreateStepDefinitionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateStepDefinitionDto) => Promise<void>;
  isSubmitting: boolean;
}

/** Converts a human-readable name to UPPERCASE_SNAKE_CASE code */
function toTypeCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')    // non-alphanum → underscore
    .replace(/^_+|_+$/g, '');       // trim leading/trailing underscores
}

const TYPE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export const CreateStepDefinitionDialog: React.FC<CreateStepDefinitionDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [typeManuallyEdited, setTypeManuallyEdited] = useState(false);
  const [typeError, setTypeError] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setType('');
      setDescription('');
      setTypeManuallyEdited(false);
      setTypeError('');
    }
  }, [open]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!typeManuallyEdited) {
      const generated = toTypeCode(value);
      setType(generated);
      validateType(generated);
    }
  };

  const handleTypeChange = (value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    setType(sanitized);
    setTypeManuallyEdited(true);
    validateType(sanitized);
  };

  const validateType = (value: string) => {
    if (!value) {
      setTypeError('El código es obligatorio');
    } else if (!TYPE_PATTERN.test(value)) {
      setTypeError('Debe comenzar con letra y contener solo MAYÚSCULAS, números y guiones bajos');
    } else {
      setTypeError('');
    }
  };

  const isValid = name.trim().length > 0 && type.length > 0 && !typeError;

  const handleSubmit = async () => {
    if (!isValid) return;
    await onSubmit({
      name: name.trim(),
      type,
      description: description.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AddCircleOutlineIcon color="primary" />
        Nuevo Tipo de Paso
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Define el nombre y código único para este tipo de paso de producción. El código se
          genera automáticamente pero puedes editarlo.
        </Typography>

        {/* Nombre */}
        <TextField
          label="Nombre"
          placeholder="Ej: Barnizado UV"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          autoFocus
          inputProps={{ maxLength: 100 }}
        />

        {/* Tipo / Código */}
        <TextField
          label="Código (tipo)"
          placeholder="Ej: BARNIZADO_UV"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          error={!!typeError}
          helperText={typeError || 'MAYÚSCULAS_GUION_BAJO — identificador único del paso'}
          inputProps={{
            style: { fontFamily: 'monospace', letterSpacing: '0.05em' },
            maxLength: 50,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Box
                  component="span"
                  sx={{ fontSize: '0.75rem', color: 'text.disabled', fontFamily: 'monospace' }}
                >
                  #
                </Box>
              </InputAdornment>
            ),
          }}
        />

        {/* Descripción */}
        <TextField
          label="Descripción (opcional)"
          placeholder="Ej: Proceso de barnizado con UV para acabado brillante"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={2}
          inputProps={{ maxLength: 500 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          startIcon={<AddCircleOutlineIcon />}
        >
          {isSubmitting ? 'Creando...' : 'Crear Paso'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
