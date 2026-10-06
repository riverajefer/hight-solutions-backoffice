import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import type { Semaphore, SemaphoreSummary } from '../../../types/production-board.types';
import { SEMAPHORE_CONFIG, SEMAPHORE_ORDER } from '../boardConfig';

interface BoardSummaryBarProps {
  summary: SemaphoreSummary;
  selected: Semaphore | null;
  onSelect: (semaphore: Semaphore | null) => void;
  generatedAt?: string;
  isFetching: boolean;
}

const formatTime = (iso?: string): string =>
  iso
    ? new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
    : '';

/** Resumen del semáforo. Cada contador filtra el tablero; un segundo clic lo quita. */
export const BoardSummaryBar: React.FC<BoardSummaryBarProps> = ({
  summary,
  selected,
  onSelect,
  generatedAt,
  isFetching,
}) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
    {SEMAPHORE_ORDER.map((semaphore) => {
      const config = SEMAPHORE_CONFIG[semaphore];
      const isSelected = selected === semaphore;
      return (
        <Chip
          key={semaphore}
          label={`${config.label}: ${summary[semaphore]}`}
          color={config.chipColor}
          variant={isSelected ? 'filled' : 'outlined'}
          onClick={() => onSelect(isSelected ? null : semaphore)}
          aria-pressed={isSelected}
          sx={{ fontWeight: 600 }}
        />
      );
    })}
    {generatedAt && (
      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
        {isFetching ? 'Actualizando…' : `Actualizado a las ${formatTime(generatedAt)}`}
      </Typography>
    )}
  </Box>
);
