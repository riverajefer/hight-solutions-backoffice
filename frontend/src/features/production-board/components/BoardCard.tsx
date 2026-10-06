import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Chip, Collapse, Divider, IconButton, Link, Paper, Tooltip, Typography } from '@mui/material';
import {
  CheckCircleOutline as OnTimeIcon,
  ErrorOutline as OverdueIcon,
  EventBusy as NoDateIcon,
  ExpandMore as ExpandMoreIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { ORDER_STATUS_CONFIG } from '../../../types/order.types';
import { WORK_ORDER_STATUS_CONFIG } from '../../../types/work-order.types';
import type {
  BoardView,
  ProductionBoardCard,
  Semaphore,
} from '../../../types/production-board.types';
import { formatCurrency, formatDateShort } from '../../../utils/formatters';
import { BOARD_STATUS_LABELS, SEMAPHORE_CONFIG } from '../boardConfig';
import { getDeliveryLabel, getSemaphore } from '../utils/deliverySemaphore';

const SEMAPHORE_ICONS: Record<Semaphore, React.ReactElement> = {
  overdue: <OverdueIcon />,
  warning: <WarningIcon />,
  'on-time': <OnTimeIcon />,
  'no-date': <NoDateIcon />,
};

const MAX_AREA_CHIPS = 2;

interface BoardCardProps {
  card: ProductionBoardCard;
  /** En la vista por asesor la tarjeta muestra el estado; en la de estado, el asesor. */
  view: BoardView;
}

export const BoardCard: React.FC<BoardCardProps> = ({ card, view }) => {
  const [expanded, setExpanded] = useState(false);

  const semaphore = getSemaphore(card.deliveryDate);
  const semaphoreConfig = SEMAPHORE_CONFIG[semaphore];
  const extraAreas = card.areas.length - MAX_AREA_CHIPS;
  const statusLabel = BOARD_STATUS_LABELS[card.status] ?? ORDER_STATUS_CONFIG[card.status].label;

  return (
    <Paper
      elevation={1}
      data-testid="board-card"
      sx={{
        p: 1.25,
        mb: 1,
        borderRadius: 2,
        borderLeft: '4px solid',
        borderLeftColor: semaphoreConfig.color,
        '&:hover': { boxShadow: 3 },
      }}
    >
      {/* Fila 1: número de OP + semáforo */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Link
          component={RouterLink}
          to={`/orders/${card.id}`}
          underline="hover"
          variant="caption"
          sx={{ fontWeight: 700, letterSpacing: 0.5 }}
        >
          {card.orderNumber}
        </Link>
        <Tooltip
          title={
            card.deliveryDate
              ? `Entrega: ${formatDateShort(card.deliveryDate)}`
              : 'La orden no tiene fecha de entrega'
          }
        >
          <Chip
            icon={SEMAPHORE_ICONS[semaphore]}
            label={getDeliveryLabel(card.deliveryDate)}
            color={semaphoreConfig.chipColor}
            variant={semaphore === 'no-date' ? 'outlined' : 'filled'}
            size="small"
            sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
          />
        </Tooltip>
      </Box>

      {/* Fila 2: cliente */}
      <Typography variant="body2" noWrap title={card.clientName} sx={{ fontWeight: 600, mt: 0.5 }}>
        {card.clientName}
      </Typography>

      {/* Fila 3: valor + asesor o estado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {formatCurrency(card.total)}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {view === 'status' ? card.advisor.name : statusLabel}
        </Typography>
      </Box>

      {/* Fila 4: áreas de producción + expandir */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        <Box sx={{ display: 'flex', gap: 0.5, flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {card.areas.slice(0, MAX_AREA_CHIPS).map((area) => (
            <Chip
              key={area.id}
              label={area.name}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: 10, maxWidth: 120 }}
            />
          ))}
          {extraAreas > 0 && (
            <Chip label={`+${extraAreas}`} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
          )}
        </Box>
        <IconButton
          size="small"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Ocultar detalle' : 'Ver detalle'}
          sx={{
            p: 0.25,
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Divider sx={{ my: 1 }} />
        {card.items.map((item) => (
          <Box key={item.id} sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.3 }}>
              <strong>{item.quantity}</strong> × {item.description}
            </Typography>
            {item.areas.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
                {item.areas.join(' · ')}
              </Typography>
            )}
          </Box>
        ))}
        <Divider sx={{ my: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Creada: {formatDateShort(card.orderDate)}
          {card.deliveryDate ? ` · Entrega: ${formatDateShort(card.deliveryDate)}` : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Saldo: {formatCurrency(card.balance)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {card.workOrder
            ? `${card.workOrder.number} · ${WORK_ORDER_STATUS_CONFIG[card.workOrder.status].label}`
            : 'Sin orden de trabajo'}
        </Typography>
      </Collapse>
    </Paper>
  );
};
