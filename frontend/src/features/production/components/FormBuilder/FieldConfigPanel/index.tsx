import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import type { FormBuilderState, FormBuilderAction, BuilderField } from '../types/formBuilder';
import { FIELD_TYPE_DEFINITIONS } from '../FieldLibrary/fieldTypes';
import { generateKey } from '../utils/generateKey';

interface FieldConfigPanelProps {
  state: FormBuilderState;
  dispatch: React.Dispatch<FormBuilderAction>;
}

const TEXT_TYPES = ['text', 'textarea'];
const NUMBER_TYPES = ['number', 'quantity', 'measurement'];
const SHOW_PLACEHOLDER_TYPES = ['text', 'textarea', 'number', 'quantity', 'measurement'];

export const FieldConfigPanel: React.FC<FieldConfigPanelProps> = ({ state, dispatch }) => {
  const allFields = [...state.specFields, ...state.execFields];
  const selectedField = allFields.find((f) => f._localId === state.selectedFieldId) ?? null;

  const [newOption, setNewOption] = useState('');

  // Reset newOption when field changes
  useEffect(() => {
    setNewOption('');
  }, [state.selectedFieldId]);

  if (!selectedField) {
    return (
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          borderLeft: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          gap: 2,
        }}
      >
        <SettingsIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
        <Typography variant="body2" color="text.disabled" textAlign="center">
          Selecciona un campo del canvas para editarlo
        </Typography>
      </Box>
    );
  }

  const allKeys = allFields.map((f) => f.key);
  const otherKeys = allKeys.filter((k) => k !== selectedField.key);

  const update = (patch: Partial<BuilderField>) => {
    dispatch({ type: 'UPDATE_FIELD', _localId: selectedField._localId, patch });
  };

  const handleLabelChange = (label: string) => {
    const newKey = generateKey(label, otherKeys);
    update({ label, key: newKey });
  };

  const handleKeyChange = (key: string) => {
    // Sanitize: allow only alphanumeric and underscore
    const sanitized = key.replace(/[^a-zA-Z0-9_]/g, '');
    update({ key: sanitized });
  };

  const handleStageChange = (_: any, newStage: 'specification' | 'execution' | null) => {
    if (!newStage || newStage === selectedField.stage) return;
    dispatch({ type: 'MOVE_FIELD_TO_STAGE', _localId: selectedField._localId, newStage });
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    const existingOptions = selectedField.options ?? [];
    if (existingOptions.includes(trimmed)) return;
    update({ options: [...existingOptions, trimmed] });
    setNewOption('');
  };

  const handleRemoveOption = (opt: string) => {
    update({ options: (selectedField.options ?? []).filter((o) => o !== opt) });
  };

  return (
    <Box
      sx={{
        width: 260,
        flexShrink: 0,
        borderLeft: '1px solid',
        borderColor: 'divider',
        overflowY: 'auto',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1.5}>
        Configuración
      </Typography>

      {/* Label */}
      <TextField
        label="Nombre del campo"
        value={selectedField.label}
        onChange={(e) => handleLabelChange(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 1.5 }}
      />

      {/* Key */}
      <TextField
        label="Clave (key)"
        value={selectedField.key}
        onChange={(e) => handleKeyChange(e.target.value)}
        size="small"
        fullWidth
        inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
        helperText="camelCase, sin espacios"
        sx={{ mb: 1.5 }}
      />

      {/* Type */}
      <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
        <InputLabel>Tipo</InputLabel>
        <Select
          value={selectedField.type}
          label="Tipo"
          onChange={(e) => update({ type: e.target.value as any })}
        >
          {FIELD_TYPE_DEFINITIONS.map((def) => (
            <MenuItem key={def.type} value={def.type}>
              {def.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Stage toggle */}
      <Box mb={1.5}>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
          Etapa
        </Typography>
        <ToggleButtonGroup
          value={selectedField.stage}
          exclusive
          onChange={handleStageChange}
          size="small"
          fullWidth
        >
          <ToggleButton value="specification" sx={{ fontSize: '0.7rem' }}>
            Especificación
          </ToggleButton>
          <ToggleButton value="execution" sx={{ fontSize: '0.7rem' }}>
            Ejecución
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Required */}
      <FormControlLabel
        control={
          <Switch
            checked={selectedField.required}
            onChange={(e) => update({ required: e.target.checked })}
            size="small"
          />
        }
        label={<Typography variant="body2">Obligatorio</Typography>}
        sx={{ mb: 1 }}
      />

      <Divider sx={{ my: 1 }} />

      {/* Placeholder */}
      {SHOW_PLACEHOLDER_TYPES.includes(selectedField.type) && (
        <TextField
          label="Placeholder"
          value={selectedField.placeholder ?? ''}
          onChange={(e) => update({ placeholder: e.target.value })}
          size="small"
          fullWidth
          sx={{ mb: 1.5 }}
        />
      )}

      {/* Options (for select type) */}
      {selectedField.type === 'select' && (
        <Box mb={1.5}>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            Opciones
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
            {(selectedField.options ?? []).length === 0 && (
              <Typography variant="caption" color="text.disabled">
                Sin opciones aún
              </Typography>
            )}
            {(selectedField.options ?? []).map((opt) => (
              <Chip
                key={opt}
                label={opt}
                size="small"
                onDelete={() => handleRemoveOption(opt)}
              />
            ))}
          </Box>
          <Box display="flex" gap={0.5}>
            <TextField
              placeholder="Nueva opción"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddOption();
                }
              }}
              size="small"
              sx={{ flex: 1 }}
            />
            <IconButton size="small" onClick={handleAddOption} color="primary">
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Validation section */}
      <Accordion
        disableGutters
        elevation={0}
        sx={{ bgcolor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: '4px !important' }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, py: 0 }}>
          <Typography variant="caption" fontWeight={600} color="text.secondary">
            Validación
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 1.5, px: 1.5 }}>
          {NUMBER_TYPES.includes(selectedField.type) && (
            <>
              <TextField
                label="Mínimo"
                type="number"
                value={selectedField.validation?.min ?? ''}
                onChange={(e) =>
                  update({
                    validation: {
                      ...selectedField.validation,
                      min: e.target.value === '' ? undefined : Number(e.target.value),
                    },
                  })
                }
                size="small"
                fullWidth
                sx={{ mb: 1 }}
              />
              <TextField
                label="Máximo"
                type="number"
                value={selectedField.validation?.max ?? ''}
                onChange={(e) =>
                  update({
                    validation: {
                      ...selectedField.validation,
                      max: e.target.value === '' ? undefined : Number(e.target.value),
                    },
                  })
                }
                size="small"
                fullWidth
              />
            </>
          )}
          {TEXT_TYPES.includes(selectedField.type) && (
            <>
              <TextField
                label="Longitud mínima"
                type="number"
                value={selectedField.validation?.minLength ?? ''}
                onChange={(e) =>
                  update({
                    validation: {
                      ...selectedField.validation,
                      minLength: e.target.value === '' ? undefined : Number(e.target.value),
                    },
                  })
                }
                size="small"
                fullWidth
                sx={{ mb: 1 }}
              />
              <TextField
                label="Longitud máxima"
                type="number"
                value={selectedField.validation?.maxLength ?? ''}
                onChange={(e) =>
                  update({
                    validation: {
                      ...selectedField.validation,
                      maxLength: e.target.value === '' ? undefined : Number(e.target.value),
                    },
                  })
                }
                size="small"
                fullWidth
              />
            </>
          )}
          {!NUMBER_TYPES.includes(selectedField.type) && !TEXT_TYPES.includes(selectedField.type) && (
            <Typography variant="caption" color="text.disabled">
              Sin reglas de validación disponibles para este tipo.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
