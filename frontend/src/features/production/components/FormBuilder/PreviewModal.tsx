import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import type { FormBuilderState } from './types/formBuilder';
import type { FieldDef } from '../../../../types/production.types';

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  state: FormBuilderState;
}

// ─── Simple field renderer for preview ────────────────────────────────────────

interface PreviewFieldProps {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
}

const PreviewField: React.FC<PreviewFieldProps> = ({ field, value, onChange }) => {
  switch (field.type) {
    case 'boolean':
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="body2">
              {field.label}
              {field.required && <span style={{ color: '#f44336' }}> *</span>}
            </Typography>
          }
        />
      );

    case 'select':
      return (
        <TextField
          select
          label={field.label}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          fullWidth
          required={field.required}
          placeholder={field.placeholder}
        >
          {(field.options ?? []).length === 0 && (
            <MenuItem value="" disabled>
              Sin opciones configuradas
            </MenuItem>
          )}
          {(field.options ?? []).map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </TextField>
      );

    case 'textarea':
      return (
        <TextField
          label={field.label}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          fullWidth
          multiline
          rows={3}
          required={field.required}
          placeholder={field.placeholder}
        />
      );

    case 'number':
    case 'quantity':
    case 'measurement':
      return (
        <TextField
          label={field.label}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          fullWidth
          type="number"
          required={field.required}
          placeholder={field.placeholder}
        />
      );

    case 'date':
    case 'datetime':
      return (
        <TextField
          label={field.label}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          fullWidth
          type={field.type === 'datetime' ? 'datetime-local' : 'date'}
          required={field.required}
          InputLabelProps={{ shrink: true }}
        />
      );

    case 'supplier':
    case 'client':
    case 'material':
      return (
        <TextField
          label={field.label}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          fullWidth
          required={field.required}
          placeholder={`Seleccionar ${field.label.toLowerCase()}...`}
          helperText={`(En producción: selector de ${field.type})`}
        />
      );

    default:
      return (
        <TextField
          label={field.label}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          fullWidth
          required={field.required}
          placeholder={field.placeholder}
        />
      );
  }
};

// ─── Stage section ────────────────────────────────────────────────────────────

interface StageSectionProps {
  title: string;
  subtitle: string;
  accentColor: string;
  fields: FieldDef[];
  values: Record<string, any>;
  onChange: (key: string, val: any) => void;
}

const StageSection: React.FC<StageSectionProps> = ({
  title,
  subtitle,
  accentColor,
  fields,
  values,
  onChange,
}) => {
  if (fields.length === 0) return null;

  return (
    <Box mb={3}>
      <Box
        sx={{
          borderLeft: `3px solid ${accentColor}`,
          pl: 1.5,
          mb: 2,
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} color={accentColor}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
      <Box display="flex" flexDirection="column" gap={2}>
        {fields.map((field) => (
          <PreviewField
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(v) => onChange(field.key, v)}
          />
        ))}
      </Box>
    </Box>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────

export const PreviewModal: React.FC<PreviewModalProps> = ({ open, onClose, state }) => {
  const [values, setValues] = useState<Record<string, any>>({});

  const handleChange = (key: string, val: any) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const totalFields = state.specFields.length + state.execFields.length;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Vista previa del formulario
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {totalFields} campo{totalFields !== 1 ? 's' : ''} — así verá el operario este paso
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {totalFields === 0 ? (
          <Alert severity="info">No hay campos definidos aún. Agrega campos al canvas.</Alert>
        ) : (
          <>
            <StageSection
              title="Especificación"
              subtitle="Se llena al crear la Orden de Producción"
              accentColor="#00bcd4"
              fields={state.specFields}
              values={values}
              onChange={handleChange}
            />
            <StageSection
              title="Ejecución"
              subtitle="Lo llena el operario al completar el paso"
              accentColor="#ff9800"
              fields={state.execFields}
              values={values}
              onChange={handleChange}
            />
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Cerrar vista previa
        </Button>
      </DialogActions>
    </Dialog>
  );
};
