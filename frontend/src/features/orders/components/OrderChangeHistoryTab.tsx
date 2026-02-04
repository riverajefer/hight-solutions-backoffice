import React, { useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CircularProgress,
  Box,
  Typography,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  DeleteForever as DeleteIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useRecordHistory } from '../../audit-logs/hooks/useAuditLogs';
import { AuditLog } from '../../../types';
import { ORDER_STATUS_CONFIG, PAYMENT_METHOD_LABELS } from '../../../types/order.types';

// ---------------------------------------------------------------------------
// Helpers de formato
// ---------------------------------------------------------------------------

const formatCurrency = (value: unknown): string => {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDateTime = (date: string): string =>
  new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

// ---------------------------------------------------------------------------
// Configuración de campos visibles por modelo
// ---------------------------------------------------------------------------

/** Campos que se muestran al usuario, por modelo Prisma */
const VISIBLE_FIELDS: Record<string, string[]> = {
  OrderItem: ['description', 'quantity', 'unitPrice'],
  Order:     ['status', 'notes', 'subtotal', 'tax', 'total', 'paidAmount', 'balance'],
  Payment:   ['amount', 'paymentMethod', 'reference'],
};

/** Etiquetas legibles para cada campo */
const FIELD_LABELS: Record<string, string> = {
  description:  'Descripción',
  quantity:     'Cantidad',
  unitPrice:    'Precio unitario',
  status:       'Estado',
  notes:        'Observaciones',
  subtotal:     'Subtotal',
  tax:          'IVA',
  total:        'Total',
  paidAmount:   'Pagado',
  balance:      'Saldo',
  amount:       'Monto',
  paymentMethod:'Método de pago',
  reference:    'Referencia',
};

/** Campos que se formatean como moneda COP */
const CURRENCY_FIELDS = new Set([
  'subtotal', 'tax', 'total', 'paidAmount', 'balance', 'unitPrice', 'amount',
]);

/**
 * Formatea un valor según el campo al que pertenece.
 */
const formatValue = (field: string, value: unknown): string => {
  if (value == null || value === '') return '—';
  if (CURRENCY_FIELDS.has(field)) return formatCurrency(value);
  if (field === 'status') {
    const cfg = ORDER_STATUS_CONFIG[value as keyof typeof ORDER_STATUS_CONFIG];
    return cfg?.label ?? String(value);
  }
  if (field === 'paymentMethod') {
    return PAYMENT_METHOD_LABELS[value as keyof typeof PAYMENT_METHOD_LABELS] ?? String(value);
  }
  return String(value);
};

// ---------------------------------------------------------------------------
// Agrupación de logs en "eventos"
// ---------------------------------------------------------------------------

interface ChangeEvent {
  /** Timestamp del primer log del grupo (para ordenar) */
  timestamp: string;
  /** Acción dominante del grupo */
  action: string;
  /** Usuario que generó el cambio */
  user: AuditLog['user'];
  /** Logs agrupados */
  logs: AuditLog[];
}

/**
 * Agrupa logs por ventana de tiempo (2 segundos).
 * Los logs que llegan de la misma transacción tienen createdAt muy cercanos.
 */
const groupLogsByEvent = (logs: AuditLog[]): ChangeEvent[] => {
  if (!logs.length) return [];

  // Ordenar por fecha ascendente
  const sorted = [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const groups: ChangeEvent[] = [];
  let currentGroup: ChangeEvent = {
    timestamp: sorted[0].createdAt,
    action:    sorted[0].action,
    user:      sorted[0].user,
    logs:      [sorted[0]],
  };

  // Ventana deslizante: cada log se compara con el anterior (no con el inicio del grupo).
  // Esto agrupa correctamente logs de una misma transacción que pueden tardar > 2s en total.
  let previousLogTime = new Date(sorted[0].createdAt).getTime();

  for (let i = 1; i < sorted.length; i++) {
    const log     = sorted[i];
    const logTime = new Date(log.createdAt).getTime();

    if (logTime - previousLogTime <= 2000) {
      // Dentro de 2 segundos del log anterior → mismo evento
      currentGroup.logs.push(log);
      // Si hay un UPDATE en el grupo, ese es el dominante
      if (log.action === 'UPDATE') currentGroup.action = 'UPDATE';
    } else {
      // Gap > 2s → cerrar grupo anterior y abrir nuevo
      groups.push(currentGroup);
      currentGroup = {
        timestamp: log.createdAt,
        action:    log.action,
        user:      log.user,
        logs:      [log],
      };
    }
    previousLogTime = logTime;
  }
  groups.push(currentGroup);

  // Retornar de más reciente a más antiguo
  return groups.reverse();
};

// ---------------------------------------------------------------------------
// Extrae los cambios campo a campo de un grupo de logs
// ---------------------------------------------------------------------------

interface FieldChange {
  label: string;
  oldValue: string;
  newValue: string;
  model: string;
  recordId?: string;        // ID del registro (para agrupar cambios de un mismo item)
  itemDescription?: string; // Descripción del item (se muestra como sub-header)
}

/** Verifica que un valor sea primitivo (no objeto ni array) */
const isPrimitive = (value: unknown): boolean =>
  value == null || typeof value !== 'object';

/**
 * Construye un mapa itemId → descripción escaneando todos los logs.
 * CREATE y DELETE logs contienen la descripción en sus datos; los usamos como referencia
 * para identificar items en logs UPDATE donde la descripción no cambió.
 */
const buildItemDescriptions = (logs: AuditLog[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const log of logs) {
    if (log.model === 'OrderItem' && log.recordId) {
      const desc =
        (log.newData as Record<string, unknown>)?.description ||
        (log.oldData as Record<string, unknown>)?.description;
      if (typeof desc === 'string' && desc) {
        map.set(log.recordId, desc);
      }
    }
  }
  return map;
};

const extractChanges = (event: ChangeEvent, itemDescriptions: Map<string, string>): FieldChange[] => {
  const changes: FieldChange[] = [];
  /** Conjunto para deduplicar cambios dentro del mismo evento */
  const seen = new Set<string>();

  const addChange = (change: FieldChange) => {
    const key = `${change.model}|${change.label}|${change.oldValue}|${change.newValue}`;
    if (seen.has(key)) return; // Evitar duplicados (log automático + manual)
    seen.add(key);
    changes.push(change);
  };

  for (const log of event.logs) {
    const visibleFields = VISIBLE_FIELDS[log.model];
    if (!visibleFields) continue;

    // Para OrderItem: adjuntar recordId + descripción del item
    const itemExtras = log.model === 'OrderItem' && log.recordId
      ? {
          recordId:        log.recordId,
          itemDescription: itemDescriptions.get(log.recordId),
        }
      : {};

    if (log.action === 'UPDATE' && log.oldData && log.newData) {
      for (const field of visibleFields) {
        const oldVal = (log.oldData as Record<string, unknown>)[field];
        const newVal = (log.newData as Record<string, unknown>)[field];
        // Ignorar valores que sean objetos/arrays (datos internos)
        if (!isPrimitive(oldVal) || !isPrimitive(newVal)) continue;
        // Solo si efectivamente cambió
        if (String(oldVal) !== String(newVal)) {
          addChange({
            label:    FIELD_LABELS[field] ?? field,
            // Si el valor es null/undefined → string vacío para que ChangeRow muestre "nuevo"/"eliminado"
            oldValue: oldVal != null && oldVal !== '' ? formatValue(field, oldVal) : '',
            newValue: newVal != null && newVal !== '' ? formatValue(field, newVal) : '',
            model:    log.model,
            ...itemExtras,
          });
        }
      }
    } else if (log.action === 'CREATE' && log.newData) {
      // Para creaciones mostrar los campos relevantes como "nuevo valor"
      for (const field of visibleFields) {
        const newVal = (log.newData as Record<string, unknown>)[field];
        if (!isPrimitive(newVal)) continue;
        if (newVal != null && newVal !== '') {
          addChange({
            label:    FIELD_LABELS[field] ?? field,
            oldValue: '',
            newValue: formatValue(field, newVal),
            model:    log.model,
            ...itemExtras,
          });
        }
      }
    } else if (log.action === 'DELETE' && log.oldData) {
      for (const field of visibleFields) {
        const oldVal = (log.oldData as Record<string, unknown>)[field];
        if (!isPrimitive(oldVal)) continue;
        if (oldVal != null && oldVal !== '') {
          addChange({
            label:    FIELD_LABELS[field] ?? field,
            oldValue: formatValue(field, oldVal),
            newValue: '',
            model:    log.model,
            ...itemExtras,
          });
        }
      }
    }
  }

  return changes;
};

// ---------------------------------------------------------------------------
// Título del evento según los modelos presentes
// ---------------------------------------------------------------------------

const getEventTitle = (event: ChangeEvent): string => {
  const models = new Set(event.logs.map((l) => l.model));

  if (event.action === 'CREATE') {
    if (models.has('Order')) return 'Orden creada';
    if (models.has('OrderItem')) return 'Item agregado';
    if (models.has('Payment')) return 'Pago registrado';
    return 'Registro creado';
  }

  if (event.action === 'DELETE') {
    if (models.has('OrderItem')) return 'Item eliminado';
    if (models.has('Order')) return 'Orden eliminada';
    return 'Registro eliminado';
  }

  // UPDATE
  if (models.has('OrderItem')) return 'Items de la orden actualizados';
  if (models.has('Payment'))   return 'Pago actualizado';
  if (models.has('Order'))     return 'Orden actualizada';
  return 'Actualización';
};

// ---------------------------------------------------------------------------
// Configuración visual por acción
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<string, {
  color: 'success' | 'info' | 'error';
  label: string;
  icon: React.ReactElement;
  dotBg: string;
}> = {
  CREATE: {
    color: 'success',
    label: 'Creación',
    icon: <CheckCircleIcon fontSize="small" />,
    dotBg: '#4caf50',
  },
  UPDATE: {
    color: 'info',
    label: 'Actualización',
    icon: <EditIcon fontSize="small" />,
    dotBg: '#2EB0C4',       // primary.main del tema
  },
  DELETE: {
    color: 'error',
    label: 'Eliminación',
    icon: <DeleteIcon fontSize="small" />,
    dotBg: '#f44336',
  },
};

// ---------------------------------------------------------------------------
// Componentes de presentación
// ---------------------------------------------------------------------------

/** Línea vertical del timeline */
const TimelineLine: React.FC<{ isLast: boolean }> = ({ isLast }) => (
  <Box
    sx={{
      width: 2,
      flex: isLast ? 0 : 1,
      minHeight: isLast ? 0 : 24,
      backgroundColor: 'divider',
    }}
  />
);

/** Punto del timeline con icono */
const TimelineDot: React.FC<{ action: string }> = ({ action }) => {
  const cfg = ACTION_CONFIG[action] ?? ACTION_CONFIG.UPDATE;
  return (
    <Avatar
      sx={{
        width: 36,
        height: 36,
        backgroundColor: cfg.dotBg,
        color: '#fff',
        boxShadow: 2,
        zIndex: 1,
        flexShrink: 0,
      }}
    >
      {cfg.icon}
    </Avatar>
  );
};

/** Una fila "antes → después" para un campo modificado */
const ChangeRow: React.FC<{ change: FieldChange }> = ({ change }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      py: 0.6,
      borderBottom: '1px dashed',
      borderColor: 'divider',
      '&:last-child': { borderBottom: 'none' },
    }}
  >
    {/* Etiqueta del campo */}
    <Typography
      variant="body2"
      sx={{ fontWeight: 600, minWidth: 120, color: 'text.secondary', flexShrink: 0 }}
    >
      {change.label}
    </Typography>

    {/* Valor anterior (si existe) */}
    {change.oldValue ? (
      <Chip
        label={change.oldValue}
        size="small"
        sx={{
          backgroundColor: 'error.light',
          color: 'error.contrastText',
          fontWeight: 500,
          maxWidth: 160,
          '& .MuiChip-label': { overflow: 'ellipsis', textOverflow: 'ellipsis' },
        }}
      />
    ) : (
      <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
        nuevo
      </Typography>
    )}

    {/* Flecha */}
    <ArrowForwardIcon fontSize="small" sx={{ color: 'text.disabled', flexShrink: 0 }} />

    {/* Valor nuevo (si existe) */}
    {change.newValue ? (
      <Chip
        label={change.newValue}
        size="small"
        sx={{
          backgroundColor: 'success.light',
          color: 'success.contrastText',
          fontWeight: 500,
          maxWidth: 160,
          '& .MuiChip-label': { overflow: 'ellipsis', textOverflow: 'ellipsis' },
        }}
      />
    ) : (
      <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
        eliminado
      </Typography>
    )}
  </Box>
);

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface OrderChangeHistoryTabProps {
  orderId: string;
}

export const OrderChangeHistoryTab: React.FC<OrderChangeHistoryTabProps> = ({
  orderId,
}) => {
  const { data: auditLogs, isLoading, isError } = useRecordHistory(orderId);

  const events = useMemo(
    () => (auditLogs ? groupLogsByEvent(auditLogs) : []),
    [auditLogs],
  );

  /** Mapa itemId → descripción, escaneado de todos los logs */
  const itemDescriptions = useMemo(
    () => (auditLogs ? buildItemDescriptions(auditLogs) : new Map<string, string>()),
    [auditLogs],
  );

  // ---------------------------------------------------------------------------
  // Estados de carga / error / vacío
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <Card>
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
      <Card>
        <CardContent>
          <Typography color="error" textAlign="center" py={3}>
            Error al cargar el historial de cambios
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!events.length) {
    return (
      <Card>
        <CardHeader
          title="Historial de Cambios"
          subheader="Registro completo de modificaciones realizadas a esta orden"
        />
        <CardContent>
          <Typography color="text.secondary" textAlign="center" py={3}>
            No hay cambios registrados para esta orden
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Render del timeline
  // ---------------------------------------------------------------------------

  return (
    <Card>
      <CardHeader
        title="Historial de Cambios"
        subheader="Registro completo de modificaciones realizadas a esta orden"
      />
      <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {events.map((event, index) => {
            const isLast    = index === events.length - 1;
            const cfg       = ACTION_CONFIG[event.action] ?? ACTION_CONFIG.UPDATE;
            const changes   = extractChanges(event, itemDescriptions);
            const userName  = event.user
              ? `${event.user.firstName || ''} ${event.user.lastName || ''}`.trim() || event.user.email
              : 'Sistema';

            return (
              <Box key={index} sx={{ display: 'flex', gap: 2 }}>
                {/* Columna izquierda: línea + punto */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
                  <TimelineLine isLast={index === 0} />
                  <TimelineDot action={event.action} />
                  <TimelineLine isLast={isLast} />
                </Box>

                {/* Columna derecha: contenido */}
                <Box sx={{ flex: 1, pb: isLast ? 0 : 3, minWidth: 0 }}>
                  {/* Header: usuario + fecha + chip acción */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexWrap: 'wrap',
                      py: 0.5,
                    }}
                  >
                    <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {userName}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      •
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {formatDateTime(event.timestamp)}
                    </Typography>
                    <Chip
                      label={cfg.label}
                      color={cfg.color}
                      size="small"
                      sx={{ fontWeight: 500, ml: 0.5 }}
                    />
                  </Box>

                  {/* Tarjeta del evento */}
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                      mt: 0.5,
                    }}
                  >
                    {/* Título del evento */}
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        backgroundColor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(46,204,113,0.08)'
                            : 'grey.50',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {getEventTitle(event)}
                      </Typography>
                    </Box>

                    {/* Lista de cambios campo a campo, agrupados por item */}
                    {changes.length > 0 ? (() => {
                      // Separar cambios de OrderItem (agrupa por recordId) y otros modelos
                      const itemGroups = new Map<string, FieldChange[]>();
                      const otherChanges: FieldChange[] = [];

                      for (const change of changes) {
                        if (change.model === 'OrderItem' && change.recordId) {
                          const group = itemGroups.get(change.recordId) ?? [];
                          group.push(change);
                          itemGroups.set(change.recordId, group);
                        } else {
                          otherChanges.push(change);
                        }
                      }

                      return (
                        <Box sx={{ px: 2, py: 1 }}>
                          {/* Primero: grupos de items con sub-header de descripción */}
                          {Array.from(itemGroups.entries()).map(([recId, itemChanges]) => (
                            <Box key={recId} sx={{ mb: itemGroups.size > 1 ? 1.5 : 0 }}>
                              {/* Sub-header: nombre del item */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  mb: 0.5,
                                  mt: 0.25,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: 'info.main',
                                    flexShrink: 0,
                                  }}
                                />
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 700, color: 'info.main' }}
                                >
                                  {itemChanges[0].itemDescription ?? 'Item'}
                                </Typography>
                              </Box>
                              {/* Cambios del item */}
                              {itemChanges.map((change, ci) => (
                                <ChangeRow key={ci} change={change} />
                              ))}
                            </Box>
                          ))}

                          {/* Luego: cambios de Order / Payment sin sub-header */}
                          {otherChanges.map((change, ci) => (
                            <ChangeRow key={`other-${ci}`} change={change} />
                          ))}
                        </Box>
                      );
                    })() : (
                      /* Si no hay campos visibles que mostrar, resumen genérico */
                      <Box sx={{ px: 2, py: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {event.action === 'CREATE'
                            ? 'Se creó el registro.'
                            : event.action === 'DELETE'
                              ? 'Se eliminó el registro.'
                              : 'Se realizó una modificación.'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};
