import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardContent,
  CircularProgress,
  Box,
  Typography,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Payments as PaymentsIcon,
  LocalOffer as LocalOfferIcon,
  SupervisorAccount as SupervisorAccountIcon,
  EditNote as EditNoteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { ordersApi } from '../../../api/orders.api';
import type {
  OrderAuthHistoryEvent,
  OrderAuthEventType,
  OrderAuthEventStatus,
} from '../../../types/order-authorization-history.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDateTime = (date?: string | null): string => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const formatCurrency = (value?: string | null): string => {
  if (value == null) return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(num);
};

type MinimalUser = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null;

const userName = (user?: MinimalUser): string => {
  if (!user) return '—';
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.email || '—';
};

// ─── Config por tipo de evento ────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  OrderAuthEventType,
  { label: string; icon: React.ReactElement; verb: string }
> = {
  ADVANCE_PAYMENT: {
    label: 'Anticipo',
    icon: <PaymentsIcon fontSize="small" />,
    verb: 'Solicitó aprobación de un pago anticipado',
  },
  DISCOUNT: {
    label: 'Descuento',
    icon: <LocalOfferIcon fontSize="small" />,
    verb: 'Solicitó aprobación de un descuento',
  },
  CLIENT_OWNERSHIP: {
    label: 'Propiedad de cliente',
    icon: <SupervisorAccountIcon fontSize="small" />,
    verb: 'Solicitó autorización de propiedad de cliente',
  },
  PAYMENT_EDIT: {
    label: 'Edición de pago',
    icon: <EditNoteIcon fontSize="small" />,
    verb: 'Solicitó autorización para editar un pago',
  },
  EDIT_REQUEST: {
    label: 'Solicitud de edición',
    icon: <EditIcon fontSize="small" />,
    verb: 'Solicitó permiso para editar la orden',
  },
};

const STATUS_CONFIG: Record<
  OrderAuthEventStatus,
  { label: string; color: 'warning' | 'success' | 'error' | 'default'; dotBg: string }
> = {
  PENDING: { label: 'Pendiente', color: 'warning', dotBg: '#ed6c02' },
  APPROVED: { label: 'Aprobada', color: 'success', dotBg: '#4caf50' },
  REJECTED: { label: 'Rechazada', color: 'error', dotBg: '#f44336' },
  EXPIRED: { label: 'Expirada', color: 'default', dotBg: '#9e9e9e' },
};

// ─── Presentational bits ──────────────────────────────────────────────────────

const TimelineLine: React.FC<{ hide: boolean }> = ({ hide }) => (
  <Box
    sx={{
      width: 2,
      flex: hide ? 0 : 1,
      minHeight: hide ? 0 : 24,
      backgroundColor: 'divider',
    }}
  />
);

const TimelineDot: React.FC<{
  type: OrderAuthEventType;
  status: OrderAuthEventStatus;
}> = ({ type, status }) => (
  <Avatar
    className="timeline-dot"
    sx={{
      width: 32,
      height: 32,
      backgroundColor: STATUS_CONFIG[status].dotBg,
      color: '#fff',
      boxShadow: (theme) =>
        theme.palette.mode === 'dark'
          ? '0 0 10px rgba(0,0,0,0.5)'
          : '0 2px 4px rgba(0,0,0,0.1)',
      zIndex: 1,
      flexShrink: 0,
      transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    }}
  >
    {TYPE_CONFIG[type].icon}
  </Avatar>
);

// ─── Main component ───────────────────────────────────────────────────────────

interface OrderAuthHistoryProps {
  orderId: string;
}

export const OrderAuthHistory: React.FC<OrderAuthHistoryProps> = ({
  orderId,
}) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['order-authorization-history', orderId],
    queryFn: () => ordersApi.getAuthorizationHistory(orderId),
    enabled: !!orderId,
  });

  const events: OrderAuthHistoryEvent[] = data ?? [];

  const HEADER = (
    <CardHeader
      title="Historial de Aprobaciones y Solicitudes de Autorización"
      subheader={
        events.length
          ? `Registro de autorizaciones y solicitudes de esta OP (${events.length})`
          : 'Registro de autorizaciones y solicitudes de esta OP'
      }
    />
  );

  if (isLoading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card variant="outlined">
        {HEADER}
        <CardContent>
          <Typography color="error" textAlign="center" py={3}>
            Error al cargar el historial de autorizaciones
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!events.length) {
    return (
      <Card variant="outlined">
        {HEADER}
        <CardContent>
          <Typography color="text.secondary" textAlign="center" py={3}>
            No hay aprobaciones ni solicitudes de autorización registradas para
            esta OP
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      {HEADER}
      <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {events.map((event, index) => {
            const typeCfg = TYPE_CONFIG[event.type];
            const statusCfg = STATUS_CONFIG[event.status];
            const isLast = index === events.length - 1;

            // Título principal del evento
            let title = typeCfg.verb;
            if (event.amount && (event.type === 'ADVANCE_PAYMENT' || event.type === 'PAYMENT_EDIT')) {
              title += ` de ${formatCurrency(event.amount)}`;
            } else if (event.amount && event.type === 'DISCOUNT') {
              title += ` de ${formatCurrency(event.amount)}`;
            } else if (event.type === 'CLIENT_OWNERSHIP' && event.advisor) {
              title += ` para ${userName(event.advisor)}`;
            }
            title += '.';

            // Línea de revisión (solicitudes resueltas)
            let reviewLine: string | null = null;
            if (event.status !== 'PENDING') {
              const verb =
                event.status === 'APPROVED'
                  ? 'Aprobada por'
                  : event.status === 'REJECTED'
                    ? 'Rechazada por'
                    : 'Resuelta';
              reviewLine =
                event.status === 'EXPIRED'
                  ? 'La solicitud expiró sin ser revisada.'
                  : `${verb}: ${userName(event.reviewedBy)}${
                      event.reviewedAt
                        ? ` · ${formatDateTime(event.reviewedAt)}`
                        : ''
                    }`;
            }

            return (
              <Box
                key={event.id}
                sx={{
                  display: 'flex',
                  gap: 2,
                  '&:hover .timeline-dot': { transform: 'scale(1.15)' },
                }}
              >
                {/* Columna izquierda: línea + punto */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 36,
                    flexShrink: 0,
                  }}
                >
                  <TimelineLine hide={index === 0} />
                  <TimelineDot type={event.type} status={event.status} />
                  <TimelineLine hide={isLast} />
                </Box>

                {/* Columna derecha: contenido */}
                <Box sx={{ flex: 1, pb: isLast ? 0 : 4, minWidth: 0 }}>
                  {/* Header: actor + fecha + tipo + estado */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexWrap: 'wrap',
                      py: 0.75,
                      px: 1,
                      borderRadius: 1.5,
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.02)'
                          : 'rgba(0,0,0,0.01)',
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      <PersonIcon
                        sx={{ color: 'text.secondary', fontSize: '1rem' }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        {userName(event.requestedBy)}
                      </Typography>
                    </Box>

                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {formatDateTime(event.createdAt)}
                    </Typography>

                    <Box
                      sx={{
                        ml: 'auto',
                        display: 'flex',
                        gap: 0.75,
                        alignItems: 'center',
                      }}
                    >
                      <Chip
                        label={typeCfg.label}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                      />
                      <Chip
                        label={statusCfg.label}
                        color={statusCfg.color}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          height: 22,
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          px: 0.5,
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Detalle */}
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      {title}
                    </Typography>

                    {event.reason && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        <strong>Motivo:</strong> {event.reason}
                      </Typography>
                    )}

                    {reviewLine && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mt: 0.5 }}
                      >
                        {reviewLine}
                      </Typography>
                    )}

                    {event.reviewNotes && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mt: 0.5, fontStyle: 'italic' }}
                      >
                        <strong>Notas:</strong> {event.reviewNotes}
                      </Typography>
                    )}
                  </Box>

                  {!isLast && <Divider sx={{ mt: 3, opacity: 0.4 }} />}
                </Box>
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default OrderAuthHistory;
