import React from 'react';
import { Box, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDate } from '../../../../utils/formatters';
import {
  CONTACT_MEDIUM_LABELS,
  Prospect,
  ProspectStatus,
} from '../../../../types/prospect.types';

interface ProspectKanbanCardProps {
  prospect: Prospect;
  isOverlay?: boolean;
  canUpdate?: boolean;
  canConvert?: boolean;
  onView?: (prospect: Prospect) => void;
  onAddContact?: (prospect: Prospect) => void;
  onConvert?: (prospect: Prospect) => void;
}

const diasDesde = (iso?: string | null): number | null =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : null;

export const ProspectKanbanCard: React.FC<ProspectKanbanCardProps> = ({
  prospect,
  isOverlay = false,
  canUpdate = false,
  canConvert = false,
  onView,
  onAddContact,
  onConvert,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: prospect.id, data: { prospect } });

  const dias = diasDesde(prospect.lastContactAt);
  const titulo = prospect.name || prospect.phone || prospect.email || 'Sin datos';
  const ultimoMedio = prospect.contacts?.[0]?.medium;

  return (
    <Card
      ref={isOverlay ? undefined : setNodeRef}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      onClick={() => onView?.(prospect)}
      sx={{
        mb: 1,
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="subtitle2" noWrap fontWeight={600}>
          {titulo}
        </Typography>

        {prospect.name && prospect.phone && (
          <Typography variant="caption" color="text.secondary" display="block">
            {prospect.phone}
          </Typography>
        )}

        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            variant="outlined"
            label={`${prospect.contactCount} contacto${prospect.contactCount === 1 ? '' : 's'}`}
          />
          {ultimoMedio && (
            <Chip size="small" variant="outlined" label={CONTACT_MEDIUM_LABELS[ultimoMedio]} />
          )}
          {dias === null ? (
            <Chip size="small" color="error" label="Sin contactar" />
          ) : (
            dias > 7 && (
              <Chip size="small" color={dias > 14 ? 'error' : 'warning'} label={`${dias} d`} />
            )
          )}
        </Stack>

        {prospect.lastContactAt && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Último: {formatDate(prospect.lastContactAt)}
          </Typography>
        )}

        {prospect.quote && (
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label={prospect.quote.quoteNumber}
            sx={{ mt: 0.5 }}
          />
        )}

        {!isOverlay && (canUpdate || canConvert) && (
          <Box
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}
          >
            {canUpdate && (
              <Tooltip title="Registrar contacto">
                <IconButton size="small" onClick={() => onAddContact?.(prospect)}>
                  <PhoneCallbackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canConvert && prospect.status !== ProspectStatus.CONVERTIDO && (
              <Tooltip title="Convertir">
                <IconButton size="small" onClick={() => onConvert?.(prospect)}>
                  <RequestQuoteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
