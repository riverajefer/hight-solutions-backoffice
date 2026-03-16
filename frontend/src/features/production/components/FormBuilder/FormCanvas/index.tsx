import React from 'react';
import { Box } from '@mui/material';
import { StageDropZone } from './StageDropZone';
import type { FormBuilderState, FormBuilderAction } from '../types/formBuilder';

interface FormCanvasProps {
  state: FormBuilderState;
  dispatch: React.Dispatch<FormBuilderAction>;
}

export const FormCanvas: React.FC<FormCanvasProps> = ({ state, dispatch }) => {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <StageDropZone
        stage="specification"
        fields={state.specFields}
        selectedFieldId={state.selectedFieldId}
        dispatch={dispatch}
      />
      <StageDropZone
        stage="execution"
        fields={state.execFields}
        selectedFieldId={state.selectedFieldId}
        dispatch={dispatch}
      />
    </Box>
  );
};
