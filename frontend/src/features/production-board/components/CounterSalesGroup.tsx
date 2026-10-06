import React, { useState } from 'react';
import { Box, ButtonBase, Collapse, Paper, Typography } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Storefront as StorefrontIcon } from '@mui/icons-material';
import type { BoardView, ProductionBoardCard } from '../../../types/production-board.types';
import { countOverdue } from '../utils/boardGrouping';
import { BoardCard } from './BoardCard';

interface CounterSalesGroupProps {
  cards: ProductionBoardCard[];
  view: BoardView;
}

/**
 * Las ventas de mostrador son cerca del 40 % de las órdenes: van resumidas en
 * un renglón para que no tapen los trabajos de producción.
 */
export const CounterSalesGroup: React.FC<CounterSalesGroupProps> = ({ cards, view }) => {
  const [expanded, setExpanded] = useState(false);

  if (cards.length === 0) return null;

  const overdue = countOverdue(cards);

  return (
    <Box sx={{ mb: 1 }}>
      <Paper variant="outlined" sx={{ borderRadius: 2, borderStyle: 'dashed', mb: expanded ? 1 : 0 }}>
        <ButtonBase
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          sx={{
            width: '100%',
            px: 1.25,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            justifyContent: 'flex-start',
            borderRadius: 2,
          }}
        >
          <StorefrontIcon fontSize="small" color="action" />
          <Typography variant="caption" sx={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>
            Mostrador · {cards.length} {cards.length === 1 ? 'orden' : 'órdenes'}
            {overdue > 0 && (
              <Box component="span" sx={{ color: 'error.main' }}>
                {' '}
                · {overdue} {overdue === 1 ? 'vencida' : 'vencidas'}
              </Box>
            )}
          </Typography>
          <ExpandMoreIcon
            fontSize="small"
            sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          />
        </ButtonBase>
      </Paper>
      <Collapse in={expanded} unmountOnExit>
        {cards.map((card) => (
          <BoardCard key={card.id} card={card} view={view} />
        ))}
      </Collapse>
    </Box>
  );
};
