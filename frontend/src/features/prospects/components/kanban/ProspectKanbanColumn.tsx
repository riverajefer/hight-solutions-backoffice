import React from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ProspectKanbanCard } from './ProspectKanbanCard';
import {
  PROSPECT_STATUS_COLORS,
  PROSPECT_STATUS_LABELS,
  Prospect,
  ProspectStatus,
} from '../../../../types/prospect.types';

interface ProspectKanbanColumnProps {
  status: ProspectStatus;
  prospects: Prospect[];
  canUpdate?: boolean;
  canConvert?: boolean;
  onView: (prospect: Prospect) => void;
  onAddContact: (prospect: Prospect) => void;
  onConvert: (prospect: Prospect) => void;
}

export const ProspectKanbanColumn: React.FC<ProspectKanbanColumnProps> = ({
  status,
  prospects,
  canUpdate,
  canConvert,
  onView,
  onAddContact,
  onConvert,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { columnStatus: status },
  });

  return (
    <Paper
      elevation={0}
      sx={{
        minWidth: 290,
        width: 290,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        bgcolor: 'action.hover',
        borderRadius: 2,
        border: 1,
        borderColor: isOver ? 'primary.main' : 'transparent',
        transition: 'border-color 120ms',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: 1.5, pb: 1 }}
      >
        <Typography variant="subtitle2" fontWeight={700}>
          {PROSPECT_STATUS_LABELS[status]}
        </Typography>
        <Chip
          size="small"
          label={prospects.length}
          color={PROSPECT_STATUS_COLORS[status]}
        />
      </Stack>

      <Box ref={setNodeRef} sx={{ px: 1.5, pb: 1.5, overflowY: 'auto', flex: 1, minHeight: 120 }}>
        <SortableContext
          items={prospects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {prospects.length === 0 ? (
            <Typography variant="caption" color="text.disabled">
              Sin prospectos
            </Typography>
          ) : (
            prospects.map((prospect) => (
              <ProspectKanbanCard
                key={prospect.id}
                prospect={prospect}
                canUpdate={canUpdate}
                canConvert={canConvert}
                onView={onView}
                onAddContact={onAddContact}
                onConvert={onConvert}
              />
            ))
          )}
        </SortableContext>
      </Box>
    </Paper>
  );
};
