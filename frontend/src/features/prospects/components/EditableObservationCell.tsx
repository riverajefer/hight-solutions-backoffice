import React, { useState } from 'react';
import { Box, TextField, Tooltip, Typography } from '@mui/material';

interface EditableObservationCellProps {
  value?: string | null;
  disabled?: boolean;
  onSave: (value: string) => void;
}

/**
 * Observación editable con un clic dentro de la tabla.
 *
 * El `DataTable` compartido no expone la edición nativa del DataGrid
 * (`processRowUpdate`), así que se resuelve aquí con un `renderCell` propio y
 * no se toca el componente común. Guarda al perder el foco o con Enter; Escape
 * descarta.
 */
export const EditableObservationCell: React.FC<EditableObservationCellProps> = ({
  value,
  disabled = false,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== (value ?? '').trim()) onSave(next);
  };

  const cancel = () => {
    setDraft(value ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <TextField
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') cancel();
        }}
        // Sin esto, el clic dentro del input llega a la fila y abre el detalle.
        onClick={(e) => e.stopPropagation()}
        size="small"
        fullWidth
        autoFocus
        multiline
        maxRows={3}
      />
    );
  }

  const empty = !value || value.trim().length === 0;

  return (
    <Tooltip title={disabled ? '' : 'Clic para editar'}>
      <Box
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          setDraft(value ?? '');
          setEditing(true);
        }}
        sx={{
          width: '100%',
          minHeight: 32,
          display: 'flex',
          alignItems: 'center',
          cursor: disabled ? 'default' : 'text',
          borderRadius: 1,
          px: 0.5,
          '&:hover': disabled ? {} : { backgroundColor: 'action.hover' },
        }}
      >
        <Typography
          variant="body2"
          color={empty ? 'text.disabled' : 'text.primary'}
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {empty ? 'Agregar observación...' : value}
        </Typography>
      </Box>
    </Tooltip>
  );
};
