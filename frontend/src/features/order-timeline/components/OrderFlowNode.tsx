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
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import type { OrderTreeNode } from '../types/order-timeline.types';

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months >= 1) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  if (weeks >= 1) return `${weeks} sem`;
  if (days >= 1) return `${days} ${days === 1 ? 'día' : 'días'}`;
  if (hours >= 1) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  return `${minutes} min`;
}

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
  NO_RESPONSE: '#9CA3AF',
  CONVERTED: '#8B5CF6',
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
  NO_RESPONSE: 'Sin respuesta',
  CONVERTED: 'Convertida',
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
  durationMs: number;
  isOngoing: boolean;
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

          {/* OP metadata: fecha, creador y saldo pendiente */}
          {nodeData.type === 'OP' && (
            <Box
              sx={{
                mt: 0.75,
                pt: 0.75,
                borderTop: `1px dashed ${alpha(config.color, 0.25)}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.4,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EventOutlinedIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                >
                  {new Date(nodeData.createdAt).toLocaleString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>

              {nodeData.createdByName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonOutlineIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                  <Typography
                    noWrap
                    variant="caption"
                    sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                  >
                    {nodeData.createdByName}
                  </Typography>
                </Box>
              )}

              {nodeData.pendingBalance != null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 11, color: nodeData.pendingBalance > 0 ? '#F97316' : '#10B981', flexShrink: 0 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: nodeData.pendingBalance > 0 ? '#F97316' : '#10B981',
                      lineHeight: 1.3,
                    }}
                  >
                    {nodeData.pendingBalance > 0
                      ? `Saldo: $${nodeData.pendingBalance.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                      : 'Pagado'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* OT metadata: fecha, asesor y diseñador */}
          {nodeData.type === 'OT' && (
            <Box
              sx={{
                mt: 0.75,
                pt: 0.75,
                borderTop: `1px dashed ${alpha(config.color, 0.25)}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.4,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EventOutlinedIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                >
                  {new Date(nodeData.createdAt).toLocaleString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>

              {nodeData.advisorName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonOutlineIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                  <Typography
                    noWrap
                    variant="caption"
                    sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                  >
                    {nodeData.advisorName}
                  </Typography>
                </Box>
              )}

              {nodeData.designerName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BrushOutlinedIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                  <Typography
                    noWrap
                    variant="caption"
                    sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                  >
                    {nodeData.designerName}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* OG metadata: fecha, creador, autorizado a y responsable */}
          {nodeData.type === 'OG' && (
            <Box
              sx={{
                mt: 0.75,
                pt: 0.75,
                borderTop: `1px dashed ${alpha(config.color, 0.25)}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.4,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EventOutlinedIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                >
                  {new Date(nodeData.createdAt).toLocaleString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>

              {nodeData.createdByName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonOutlineIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                  <Typography
                    noWrap
                    variant="caption"
                    sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                  >
                    {nodeData.createdByName}
                  </Typography>
                </Box>
              )}

              {nodeData.authorizedToName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <HowToRegOutlinedIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                  <Typography
                    noWrap
                    variant="caption"
                    sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                  >
                    {nodeData.authorizedToName}
                  </Typography>
                </Box>
              )}

              {nodeData.responsibleName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AssignmentIndOutlinedIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                  <Typography
                    noWrap
                    variant="caption"
                    sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                  >
                    {nodeData.responsibleName}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* COT metadata: fecha, creador y canal comercial */}
          {nodeData.type === 'COT' && (
            <Box
              sx={{
                mt: 0.75,
                pt: 0.75,
                borderTop: `1px dashed ${alpha(config.color, 0.25)}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.4,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EventOutlinedIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                >
                  {new Date(nodeData.createdAt).toLocaleString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>

              {nodeData.createdByName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonOutlineIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                  <Typography
                    noWrap
                    variant="caption"
                    sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                  >
                    {nodeData.createdByName}
                  </Typography>
                </Box>
              )}

              {nodeData.commercialChannelName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CampaignOutlinedIcon sx={{ fontSize: 11, color: theme.palette.text.disabled, flexShrink: 0 }} />
                  <Typography
                    noWrap
                    variant="caption"
                    sx={{ fontSize: '0.68rem', color: theme.palette.text.secondary, lineHeight: 1.3 }}
                  >
                    {nodeData.commercialChannelName}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Footer with status and duration */}
        <Box
          sx={{
            px: 1.5,
            pb: 1,
            display: 'flex',
            justifyContent: nodeData.type === 'OG' ? 'flex-end' : 'space-between',
            alignItems: 'center',
          }}
        >
          {nodeData.type !== 'OG' && (
            <Chip
              icon={<AccessTimeIcon sx={{ fontSize: '0.65rem !important' }} />}
              label={formatDuration(nodeData.durationMs)}
              size="small"
              sx={{
                bgcolor: nodeData.isOngoing
                  ? alpha(config.color, 0.12)
                  : alpha('#9CA3AF', 0.12),
                color: nodeData.isOngoing ? config.color : '#9CA3AF',
                fontWeight: 600,
                fontSize: '0.62rem',
                height: 20,
                '& .MuiChip-label': { px: 0.75 },
                '& .MuiChip-icon': {
                  color: nodeData.isOngoing ? config.color : '#9CA3AF',
                  ml: 0.5,
                },
              }}
            />
          )}
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
