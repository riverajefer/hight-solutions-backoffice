import React from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatDateTime } from '../../../utils/formatters';
import {
  CONTACT_MEDIUM_LABELS,
  CONTACT_OUTCOME_LABELS,
  ContactOutcome,
  Prospect,
  prospectHasDocument,
} from '../../../types/prospect.types';
import { ProspectStatusChip } from './ProspectStatusChip';

interface ProspectDetailDrawerProps {
  open: boolean;
  prospect?: Prospect | null;
  isLoading?: boolean;
  canUpdate?: boolean;
  canConvert?: boolean;
  onClose: () => void;
  onAddContact: () => void;
  onDeleteContact: (contactId: string) => void;
  onConvert: () => void;
}

const outcomeColor = (
  outcome?: ContactOutcome | null,
): 'default' | 'success' | 'error' | 'warning' | 'info' => {
  switch (outcome) {
    case ContactOutcome.CONTESTO:
      return 'success';
    case ContactOutcome.SOLICITO_COTIZACION:
      return 'info';
    case ContactOutcome.NO_CONTESTO:
      return 'warning';
    case ContactOutcome.NO_INTERESADO:
      return 'error';
    default:
      return 'default';
  }
};

export const ProspectDetailDrawer: React.FC<ProspectDetailDrawerProps> = ({
  open,
  prospect,
  isLoading = false,
  canUpdate = false,
  canConvert = false,
  onClose,
  onAddContact,
  onDeleteContact,
  onConvert,
}) => {
  const navigate = useNavigate();
  const titulo =
    prospect?.name || prospect?.phone || prospect?.email || 'Prospecto';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, p: 2 } }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" noWrap>
          {titulo}
        </Typography>
        <IconButton onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </IconButton>
      </Stack>

      {isLoading || !prospect ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }} flexWrap="wrap" useFlexGap>
            <ProspectStatusChip status={prospect.status} />
            {prospect.quote && (
              <Chip
                size="small"
                variant="outlined"
                color="info"
                label={prospect.quote.quoteNumber}
                onClick={() => navigate(`/quotes/${prospect.quote!.id}`)}
              />
            )}
            {prospect.order && (
              <Chip
                size="small"
                variant="outlined"
                color="success"
                label={prospect.order.orderNumber}
                onClick={() => navigate(`/orders/${prospect.order!.id}`)}
              />
            )}
          </Stack>

          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {prospect.phone && (
              <Stack direction="row" spacing={1} alignItems="center">
                <PhoneIcon fontSize="small" color="action" />
                <Link href={`tel:${prospect.phone}`} variant="body2">
                  {prospect.phone}
                </Link>
              </Stack>
            )}
            {prospect.email && (
              <Stack direction="row" spacing={1} alignItems="center">
                <EmailIcon fontSize="small" color="action" />
                <Link href={`mailto:${prospect.email}`} variant="body2">
                  {prospect.email}
                </Link>
              </Stack>
            )}
            <Typography variant="body2" color="text.secondary">
              Vendedora:{' '}
              {[prospect.advisor?.firstName, prospect.advisor?.lastName]
                .filter(Boolean)
                .join(' ') || '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Creado: {formatDate(prospect.createdAt)}
            </Typography>
          </Stack>

          {prospect.observation && (
            <>
              <Typography variant="subtitle2">Observación</Typography>
              <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {prospect.observation}
              </Typography>
            </>
          )}

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {canUpdate && (
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onAddContact}
              >
                Registrar contacto
              </Button>
            )}
            {canConvert && !prospectHasDocument(prospect) && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<RequestQuoteIcon />}
                onClick={onConvert}
              >
                Convertir
              </Button>
            )}
          </Stack>

          <Divider sx={{ mb: 1.5 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Historial de contactos ({prospect.contactCount})
          </Typography>

          {(prospect.contacts ?? []).length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aún no se ha registrado ningún contacto.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {(prospect.contacts ?? []).map((contact) => (
                <Box
                  key={contact.id}
                  sx={{
                    borderLeft: 3,
                    borderColor: 'primary.main',
                    pl: 1.5,
                    py: 0.5,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={600}>
                        {CONTACT_MEDIUM_LABELS[contact.medium]}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(contact.contactDate)}
                      </Typography>
                    </Stack>
                    {canUpdate && (
                      <Tooltip title="Eliminar contacto">
                        <IconButton
                          size="small"
                          onClick={() => onDeleteContact(contact.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  {contact.outcome && (
                    <Chip
                      size="small"
                      label={CONTACT_OUTCOME_LABELS[contact.outcome]}
                      color={outcomeColor(contact.outcome)}
                      sx={{ mt: 0.5 }}
                    />
                  )}
                  {contact.note && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {contact.note}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled" display="block">
                    Registrado {formatDateTime(contact.createdAt)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}
    </Drawer>
  );
};
