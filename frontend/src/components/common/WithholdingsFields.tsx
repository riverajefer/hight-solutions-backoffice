import React from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  EMPTY_WITHHOLDINGS,
  RETEFUENTE_OPTIONS,
  RETEICA_OPTIONS,
  RETEIVA_OPTIONS,
  type WithholdingsValue,
} from '../../utils/withholdings';

interface WithholdingsFieldsProps {
  value: WithholdingsValue;
  onChange: (value: WithholdingsValue) => void;
  /** Las retenciones se habilitan solo con IVA activo, igual que en la OP. */
  applyIva: boolean;
  disabled?: boolean;
  error?: string;
}

/**
 * Inputs de retenciones compartidos por la Orden de Gasto y la Cuenta por
 * Pagar. Replica los del formulario de OP: mismas tasas, mismo «Otro» para el
 * retefuente y la misma dependencia del IVA.
 */
export const WithholdingsFields: React.FC<WithholdingsFieldsProps> = ({
  value,
  onChange,
  applyIva,
  disabled = false,
  error,
}) => {
  const set = (patch: Partial<WithholdingsValue>) => onChange({ ...value, ...patch });

  return (
    <Box>
      <FormControlLabel
        control={
          <Checkbox
            checked={value.apply && applyIva}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? { ...value, apply: true }
                  : { ...EMPTY_WITHHOLDINGS },
              )
            }
            disabled={disabled || !applyIva}
          />
        }
        label={
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Aplicar Retenciones
            </Typography>
            {!applyIva && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                Debe activar el IVA para aplicar retenciones
              </Typography>
            )}
          </Box>
        }
      />

      {error && (
        <Typography variant="caption" color="error" sx={{ ml: 4, display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}

      {value.apply && applyIva && (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Retefuente"
              value={value.retefuente}
              onChange={(e) =>
                set({
                  retefuente: e.target.value,
                  retefuenteCustom: e.target.value === 'other' ? value.retefuenteCustom : '',
                })
              }
              disabled={disabled}
            >
              <MenuItem value="">Sin seleccionar</MenuItem>
              {RETEFUENTE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}%
                </MenuItem>
              ))}
              <MenuItem value="other">Otro</MenuItem>
            </TextField>
          </Grid>

          {value.retefuente === 'other' && (
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Retefuente personalizado (%)"
                type="number"
                inputProps={{ step: '0.1', min: '0' }}
                helperText="Ingrese el porcentaje"
                value={value.retefuenteCustom}
                onChange={(e) => set({ retefuenteCustom: e.target.value })}
                disabled={disabled}
              />
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="ReteICA"
              value={value.reteICA}
              onChange={(e) => set({ reteICA: e.target.value })}
              disabled={disabled}
            >
              <MenuItem value="">Sin seleccionar</MenuItem>
              {RETEICA_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}%
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="ReteIVA"
              value={value.reteIVA}
              onChange={(e) => set({ reteIVA: e.target.value })}
              disabled={disabled}
            >
              <MenuItem value="">Sin seleccionar</MenuItem>
              {RETEIVA_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}%
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
