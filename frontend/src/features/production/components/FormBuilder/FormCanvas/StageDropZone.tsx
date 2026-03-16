import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { FieldCard } from './FieldCard';
import type { Stage, BuilderField, FormBuilderAction } from '../types/formBuilder';

interface StageDropZoneProps {
  stage: Stage;
  fields: BuilderField[];
  selectedFieldId: string | null;
  dispatch: React.Dispatch<FormBuilderAction>;
}

const STAGE_CONFIG = {
  specification: {
    label: 'Especificación',
    sublabel: 'Campos que se llenan al crear la Orden de Producción',
    accentColor: '#00bcd4',
    bgColor: 'rgba(0, 188, 212, 0.04)',
  },
  execution: {
    label: 'Ejecución',
    sublabel: 'Campos que llena el operario al completar el paso',
    accentColor: '#ff9800',
    bgColor: 'rgba(255, 152, 0, 0.04)',
  },
};

export const StageDropZone: React.FC<StageDropZoneProps> = ({
  stage,
  fields,
  selectedFieldId,
  dispatch,
}) => {
  const config = STAGE_CONFIG[stage];

  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone-${stage}`,
    data: { type: 'stage-dropzone', stage },
  });

  const itemIds = fields.map((f) => f._localId);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRight: stage === 'specification' ? '1px solid' : 'none',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* Stage header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '2px solid',
          borderColor: config.accentColor,
          bgcolor: config.bgColor,
          flexShrink: 0,
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{ color: config.accentColor, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          {config.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {config.sublabel}
        </Typography>
      </Box>

      {/* Drop area */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <Box
          ref={setNodeRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 1.5,
            minHeight: 120,
            bgcolor: isOver && fields.length === 0 ? `${config.accentColor}10` : 'transparent',
            transition: 'background-color 0.2s',
          }}
        >
          {fields.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: 100,
                border: `2px dashed ${isOver ? config.accentColor : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 2,
                gap: 1,
                transition: 'border-color 0.2s',
              }}
            >
              <AddCircleOutlineIcon
                sx={{ color: isOver ? config.accentColor : 'text.disabled', fontSize: 28 }}
              />
              <Typography variant="caption" color={isOver ? config.accentColor : 'text.disabled'} textAlign="center">
                Arrastra campos aquí
              </Typography>
            </Box>
          ) : (
            fields.map((field) => (
              <FieldCard
                key={field._localId}
                field={field}
                isSelected={selectedFieldId === field._localId}
                dispatch={dispatch}
              />
            ))
          )}
        </Box>
      </SortableContext>
    </Box>
  );
};
