import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { useTheme, alpha } from '@mui/material/styles';
import DescriptionIcon from '@mui/icons-material/Description';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BuildIcon from '@mui/icons-material/Build';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import type { OrderTreeNode } from '../types/order-timeline.types';

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  COT: { label: 'Cotización', color: '#8B5CF6', icon: DescriptionIcon },
  OP: { label: 'Orden de Pedido', color: '#2EB0C4', icon: ShoppingCartIcon },
  OT: { label: 'Orden de Trabajo', color: '#F97316', icon: BuildIcon },
  OG: { label: 'Orden de Gasto', color: '#22D3EE', icon: RequestQuoteIcon },
};

const STATUS_COLORS: Record<string, string> = {
  // Quote statuses
  DRAFT: '#9CA3AF',
  SENT: '#FBBF24',
  ACCEPTED: '#22D3EE',
  REJECTED: '#FF2D95',
  CONVERTED: '#8B5CF6',
  CANCELLED: '#FF2D95',
  // Order statuses
  CONFIRMED: '#22D3EE',
  IN_PRODUCTION: '#F97316',
  READY: '#22D3EE',
  DELIVERED: '#10B981',
  DELIVERED_ON_CREDIT: '#FBBF24',
  WARRANTY: '#F97316',
  PAID: '#10B981',
  // WorkOrder statuses
  COMPLETED: '#10B981',
  // ExpenseOrder statuses
  CREATED: '#FBBF24',
  AUTHORIZED: '#22D3EE',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  CONVERTED: 'Convertida',
  CANCELLED: 'Cancelada',
  CONFIRMED: 'Confirmada',
  IN_PRODUCTION: 'En Producción',
  READY: 'Lista',
  DELIVERED: 'Entregada',
  DELIVERED_ON_CREDIT: 'Entregada a Crédito',
  WARRANTY: 'Garantía',
  PAID: 'Pagada',
  COMPLETED: 'Completada',
  CREATED: 'Creada',
  AUTHORIZED: 'Autorizada',
};

export interface OrderFlowNodeData extends OrderTreeNode {
  isFocused: boolean;
  [key: string]: unknown;
}

function OrderFlowNode({ data }: NodeProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const nodeData = data as OrderFlowNodeData;
  const config = TYPE_CONFIG[nodeData.type] || TYPE_CONFIG.OP;
  const statusColor = STATUS_COLORS[nodeData.status] || '#9CA3AF';
  const statusLabel = STATUS_LABELS[nodeData.status] || nodeData.status;
  const IconComponent = config.icon;

  const handleClick = () => {
    navigate(nodeData.detailPath);
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: config.color,
          width: 8,
          height: 8,
          border: 'none',
        }}
      />
      <Box
        onClick={handleClick}
        sx={{
          width: 260,
          cursor: 'pointer',
          borderRadius: 2,
          border: `2px solid ${nodeData.isFocused ? config.color : alpha(config.color, 0.3)}`,
          bgcolor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.95)
            : theme.palette.background.paper,
          boxShadow: nodeData.isFocused
            ? `0 0 20px ${alpha(config.color, 0.4)}, 0 0 40px ${alpha(config.color, 0.1)}`
            : `0 2px 8px ${alpha('#000', 0.2)}`,
          transition: 'all 0.2s ease-in-out',
          overflow: 'hidden',
          '&:hover': {
            borderColor: config.color,
            boxShadow: `0 0 16px ${alpha(config.color, 0.3)}`,
            transform: 'scale(1.02)',
          },
        }}
      >
        {/* Header with type badge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            bgcolor: alpha(config.color, 0.1),
            borderBottom: `1px solid ${alpha(config.color, 0.2)}`,
          }}
        >
          <IconComponent sx={{ fontSize: 18, color: config.color }} />
          <Chip
            label={nodeData.type}
            size="small"
            sx={{
              bgcolor: alpha(config.color, 0.2),
              color: config.color,
              fontWeight: 700,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              fontSize: '0.8rem',
              flex: 1,
              textAlign: 'right',
            }}
          >
            {nodeData.number}
          </Typography>
        </Box>

        {/* Body */}
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography
            variant="body2"
            noWrap
            sx={{
              color: theme.palette.text.secondary,
              fontSize: '0.75rem',
              mb: 0.5,
            }}
          >
            {nodeData.clientName}
          </Typography>

          {nodeData.total != null && (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                fontSize: '0.8rem',
                mb: 0.5,
              }}
            >
              ${nodeData.total.toLocaleString('es-CO', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Typography>
          )}
        </Box>

        {/* Footer with status */}
        <Box
          sx={{
            px: 1.5,
            pb: 1,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Chip
            label={statusLabel}
            size="small"
            sx={{
              bgcolor: alpha(statusColor, 0.15),
              color: statusColor,
              fontWeight: 600,
              fontSize: '0.65rem',
              height: 20,
              '& .MuiChip-label': { px: 1 },
            }}
          />
        </Box>
      </Box>
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: config.color,
          width: 8,
          height: 8,
          border: 'none',
        }}
      />
    </>
  );
}

export default memo(OrderFlowNode);
