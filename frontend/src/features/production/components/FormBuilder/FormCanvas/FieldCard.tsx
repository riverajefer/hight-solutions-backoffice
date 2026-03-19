import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { BuilderField } from '../types/formBuilder';
import type { FormBuilderAction } from '../types/formBuilder';

interface FieldCardProps {
  field: BuilderField;
  isSelected: boolean;
  dispatch: React.Dispatch<FormBuilderAction>;
}

const TYPE_CHIP_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'> = {
  text: 'default',
  textarea: 'default',
  number: 'secondary',
  quantity: 'secondary',
  measurement: 'secondary',
  boolean: 'info',
  select: 'info',
  date: 'warning',
  datetime: 'warning',
  supplier: 'success',
  client: 'success',
  material: 'success',
};

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  textarea: 'Área',
  number: 'Número',
  quantity: 'Cantidad',
  measurement: 'Medidas',
  boolean: 'Sí/No',
  select: 'Selección',
  date: 'Fecha',
  datetime: 'Fecha/Hora',
  supplier: 'Proveedor',
  client: 'Cliente',
  material: 'Material',
};

export const FieldCard: React.FC<FieldCardProps> = ({ field, isSelected, dispatch }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field._localId,
    data: {
      type: 'canvas-field',
      stage: field.stage,
      _localId: field._localId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_FIELD', _localId: field._localId });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'REMOVE_FIELD', _localId: field._localId });
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        mb: 0.75,
        borderRadius: 1,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        boxShadow: isSelected ? '0 0 0 2px rgba(33, 150, 243, 0.3)' : 'none',
        opacity: isDragging ? 0.3 : 1,
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': {
          borderColor: isSelected ? 'primary.main' : 'action.active',
        },
      }}
    >
      {/* Drag handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          color: 'text.disabled',
          display: 'flex',
          alignItems: 'center',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <DragIndicatorIcon sx={{ fontSize: 18 }} />
      </Box>

      {/* Field label */}
      <Typography variant="body2" fontWeight={500} sx={{ flex: 1, userSelect: 'none' }} noWrap>
        {field.label || <em style={{ color: '#888' }}>Sin nombre</em>}
      </Typography>

      {/* Required badge */}
      {field.required && (
        <Typography variant="caption" color="error.main" sx={{ userSelect: 'none' }}>
          *
        </Typography>
      )}

      {/* Type chip */}
      <Chip
        label={TYPE_LABELS[field.type] ?? field.type}
        size="small"
        color={TYPE_CHIP_COLORS[field.type] ?? 'default'}
        variant="outlined"
        sx={{ fontSize: '0.65rem', height: 20, pointerEvents: 'none' }}
      />

      {/* Delete button */}
      <Tooltip title="Eliminar campo">
        <IconButton
          size="small"
          onClick={handleDelete}
          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
