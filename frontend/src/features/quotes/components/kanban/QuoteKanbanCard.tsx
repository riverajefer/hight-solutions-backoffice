import React from 'react';
import {
  Avatar,
  Box,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ShoppingCartCheckout as ConvertIcon,
} from '@mui/icons-material';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { QuoteStatusChip } from '../QuoteStatusChip';
import type { Quote } from '../../../../types/quote.types';
import { QuoteStatus } from '../../../../types/quote.types';
import { PERMISSIONS } from '../../../../utils/constants';
import { useAuthStore } from '../../../../store/authStore';

const formatCurrency = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
};

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('es-CO').format(new Date(date));

const getInitials = (firstName?: string, lastName?: string): string => {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
};

interface QuoteKanbanCardProps {
  quote: Quote;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (quote: Quote) => void;
  onConvert: (quote: Quote) => void;
  overlay?: boolean;
}

export const QuoteKanbanCard: React.FC<QuoteKanbanCardProps> = ({
  quote,
  onView,
  onEdit,
  onDelete,
  onConvert,
  overlay = false,
}) => {
  const { hasPermission } = useAuthStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: quote.id,
    data: { quote },
    disabled: overlay,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const isConverted = quote.status === QuoteStatus.CONVERTED;
  const canEdit = !isConverted && hasPermission(PERMISSIONS.UPDATE_QUOTES);
  const canDelete = quote.status === QuoteStatus.DRAFT && hasPermission(PERMISSIONS.DELETE_QUOTES);
  const canConvert = quote.status === QuoteStatus.ACCEPTED && hasPermission(PERMISSIONS.CONVERT_QUOTES);

  const advisorName = quote.createdBy
    ? `${quote.createdBy.firstName ?? ''} ${quote.createdBy.lastName ?? ''}`.trim() ||
      quote.createdBy.email
    : undefined;

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      elevation={isDragging ? 8 : 1}
      sx={{
        p: 1.5,
        mb: 1,
        borderRadius: 2,
        cursor: overlay ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.4 : 1,
        transition: 'box-shadow 0.15s, opacity 0.15s',
        position: 'relative',
        '&:hover .card-actions': { opacity: 1 },
        '&:hover': { boxShadow: 3 },
        userSelect: 'none',
      }}
      {...(!overlay ? { ...listeners, ...attributes } : {})}
    >
      {/* Row 1: Quote number + status chip */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: 0.5 }}
        >
          {quote.quoteNumber}
        </Typography>
        <QuoteStatusChip status={quote.status} size="small" />
      </Box>

      {/* Row 2: Client name */}
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          mb: 0.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {quote.client?.name ?? '—'}
      </Typography>

      {/* Row 3: Advisor avatar + name */}
      {advisorName && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <Avatar
            src={(quote.createdBy as any)?.profilePhoto ?? undefined}
            sx={{ width: 22, height: 22, fontSize: 10 }}
          >
            {getInitials(quote.createdBy?.firstName, quote.createdBy?.lastName)}
          </Avatar>
          <Typography variant="caption" color="text.secondary" noWrap>
            {advisorName}
          </Typography>
        </Box>
      )}

      {/* Row 4: Total + date */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
          {formatCurrency(quote.total)}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {formatDate(quote.quoteDate)}
        </Typography>
      </Box>

      {/* Quick actions (show on hover) */}
      <Box
        className="card-actions"
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          display: 'flex',
          gap: 0.25,
          opacity: 0,
          transition: 'opacity 0.15s',
          backgroundColor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
          px: 0.5,
          pointerEvents: overlay ? 'none' : 'auto',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Tooltip title="Ver detalle">
          <IconButton size="small" onClick={() => onView(quote.id)}>
            <ViewIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        {canEdit && (
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => onEdit(quote.id)}>
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
        {canDelete && (
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => onDelete(quote)}>
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
        {canConvert && (
          <Tooltip title="Convertir a Orden">
            <IconButton size="small" color="success" onClick={() => onConvert(quote)}>
              <ConvertIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};
