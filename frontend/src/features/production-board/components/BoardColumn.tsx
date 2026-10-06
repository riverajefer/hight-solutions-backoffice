import React, { useState } from 'react';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import type { BoardColumnData, BoardView } from '../../../types/production-board.types';
import { COLUMN_CAP } from '../boardConfig';
import { countOverdue } from '../utils/boardGrouping';
import { BoardCard } from './BoardCard';
import { CounterSalesGroup } from './CounterSalesGroup';

interface BoardColumnProps {
  column: BoardColumnData;
  view: BoardView;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({ column, view }) => {
  const [showAll, setShowAll] = useState(false);

  const total = column.cards.length + column.counterSales.length;
  const overdue = countOverdue(column.cards) + countOverdue(column.counterSales);
  const visibleCards = showAll ? column.cards : column.cards.slice(0, COLUMN_CAP);
  const hiddenCount = column.cards.length - visibleCards.length;

  return (
    <Paper
      elevation={0}
      data-testid="board-column"
      sx={{
        width: { xs: '85vw', sm: 300 },
        maxWidth: 340,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.default' : 'grey.50'),
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        scrollSnapAlign: 'start',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: '3px solid',
          borderBottomColor: column.color,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle2" noWrap title={column.title} sx={{ fontWeight: 700, flex: 1 }}>
          {column.title}
        </Typography>
        {overdue > 0 && (
          <Chip
            label={`${overdue} ${overdue === 1 ? 'vencida' : 'vencidas'}`}
            color="error"
            size="small"
            sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
          />
        )}
        <Chip label={total} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 600 }} />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 1, minHeight: 0 }}>
        {total === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 120,
              color: 'text.disabled',
            }}
          >
            <Typography variant="caption">Sin órdenes</Typography>
          </Box>
        ) : (
          <>
            <CounterSalesGroup cards={column.counterSales} view={view} />
            {visibleCards.map((card) => (
              <BoardCard key={card.id} card={card} view={view} />
            ))}
            {(hiddenCount > 0 || showAll) && column.cards.length > COLUMN_CAP && (
              <Button fullWidth size="small" onClick={() => setShowAll((current) => !current)}>
                {showAll ? 'Ver menos' : `Ver ${hiddenCount} más`}
              </Button>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
};
