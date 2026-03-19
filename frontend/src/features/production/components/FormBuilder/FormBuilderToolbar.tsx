import React from 'react';
import { Box, Typography, Button, Chip, CircularProgress } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Visibility';
import type { FormBuilderState, FormBuilderAction } from './types/formBuilder';
import type { UpdateFieldSchemaPayload } from '../../../../types/production.types';
import { serializeToPayload } from './utils/schemaSerializer';

interface FormBuilderToolbarProps {
  stepDefName: string;
  stepDefType: string;
  state: FormBuilderState;
  dispatch: React.Dispatch<FormBuilderAction>;
  onSave: (payload: UpdateFieldSchemaPayload) => void;
  isSaving: boolean;
}

export const FormBuilderToolbar: React.FC<FormBuilderToolbarProps> = ({
  stepDefName,
  stepDefType,
  state,
  dispatch,
  onSave,
  isSaving,
}) => {
  const handleSave = () => {
    const payload = serializeToPayload(state);
    onSave(payload);
    dispatch({ type: 'MARK_CLEAN' });
  };

  const totalFields = state.specFields.length + state.execFields.length;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      {/* Step info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {stepDefName}
          </Typography>
          <Chip
            label={stepDefType}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
          <Chip
            label={`${totalFields} campo${totalFields !== 1 ? 's' : ''}`}
            size="small"
            color="default"
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Editor de campos del paso de producción
        </Typography>
      </Box>

      {/* Dirty indicator */}
      {state.isDirty && (
        <Chip
          label="Sin guardar"
          size="small"
          color="warning"
          variant="filled"
          sx={{ fontSize: '0.7rem' }}
        />
      )}

      {/* Preview button */}
      <Button
        variant="outlined"
        size="small"
        startIcon={<PreviewIcon />}
        onClick={() => dispatch({ type: 'OPEN_PREVIEW' })}
        disabled={totalFields === 0}
      >
        Vista previa
      </Button>

      {/* Save button */}
      <Button
        variant="contained"
        size="small"
        startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
        onClick={handleSave}
        disabled={!state.isDirty || isSaving}
      >
        {isSaving ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </Box>
  );
};
