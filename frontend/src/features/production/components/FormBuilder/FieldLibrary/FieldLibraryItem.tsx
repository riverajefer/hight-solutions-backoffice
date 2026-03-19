import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Box, Typography, Tooltip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { FieldTypeDefinition } from './fieldTypes';

interface FieldLibraryItemProps {
  fieldTypeDef: FieldTypeDefinition;
}

const TYPE_COLORS: Record<string, string> = {
  basico: '#00bcd4',
  numerico: '#7c4dff',
  fecha: '#ff9800',
  referencia: '#4caf50',
};

export const FieldLibraryItem: React.FC<FieldLibraryItemProps> = ({ fieldTypeDef }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${fieldTypeDef.type}`,
    data: {
      type: 'library-field',
      fieldType: fieldTypeDef.type,
      defaultLabel: fieldTypeDef.defaultLabel,
      defaultRequired: fieldTypeDef.defaultRequired ?? false,
      defaultStage: fieldTypeDef.defaultStage,
    },
  });

  const accentColor = TYPE_COLORS[fieldTypeDef.category] ?? '#00bcd4';

  return (
    <Tooltip title={fieldTypeDef.description} placement="right" arrow>
      <Box
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          mb: 0.5,
          borderRadius: 1,
          cursor: 'grab',
          opacity: isDragging ? 0.4 : 1,
          borderLeft: `3px solid ${accentColor}`,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderLeftColor: accentColor,
          transition: 'background-color 0.15s',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      >
        <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
        <Typography variant="body2" fontWeight={500} sx={{ flex: 1, userSelect: 'none' }}>
          {fieldTypeDef.label}
        </Typography>
      </Box>
    </Tooltip>
  );
};
