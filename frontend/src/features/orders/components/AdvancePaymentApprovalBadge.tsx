import React, { useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  Popover,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ScheduleIcon from '@mui/icons-material/Schedule';
import NotesIcon from '@mui/icons-material/Notes';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AdvancePaymentApproval } from '../../../types/order.types';

interface AdvancePaymentApprovalBadgeProps {
  approval: AdvancePaymentApproval;
}

type StatusColor = 'success' | 'warning' | 'error';

interface StatusConfig {
  color: StatusColor;
  icon: React.ReactElement;
  chipLabel: string;
  title: string;
  statusLabel: string;
  /** Etiqueta de quién revisó y cuándo, según el desenlace */
  reviewerLabel: string;
  reviewDateLabel: string;
}

const STATUS_CONFIG: Record<AdvancePaymentApproval['status'], StatusConfig> = {
  APPROVED: {
    color: 'success',
    icon: <CheckCircleIcon fontSize="small" />,
    chipLabel: 'Aprobado',
    title: 'Anticipo aprobado',
    statusLabel: 'Aprobada',
    reviewerLabel: 'Aprobado por',
    reviewDateLabel: 'Fecha de aprobación',
  },
  PENDING: {
    color: 'warning',
    icon: <HourglassEmptyIcon fontSize="small" />,
    chipLabel: 'Pendiente de aprobación',
    title: 'Anticipo pendiente de aprobación',
    statusLabel: 'Pendiente',
    reviewerLabel: 'Revisado por',
    reviewDateLabel: 'Fecha de revisión',
  },
  REJECTED: {
    color: 'error',
    icon: <CancelIcon fontSize="small" />,
    chipLabel: 'Rechazado',
    title: 'Anticipo rechazado',
    statusLabel: 'Rechazada',
    reviewerLabel: 'Rechazado por',
    reviewDateLabel: 'Fecha de rechazo',
  },
};

const formatDateLong = (date: string): string =>
  format(new Date(date), "d 'de' MMMM, yyyy HH:mm", { locale: es });

const formatUser = (user?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
} | null): string => {
  if (!user) return '-';
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name || user.email || '-';
};

interface DetailRowProps {
  icon: React.ReactElement;
  label: string;
  value: React.ReactNode;
  caption?: string | null;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, caption }) => (
  <Stack direction="row" spacing={1.25} alignItems="flex-start">
    <Box
      sx={{
        color: 'text.disabled',
        display: 'flex',
        mt: '2px',
        '& svg': { fontSize: 18 },
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', lineHeight: 1.4 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
          {caption}
        </Typography>
      )}
    </Box>
  </Stack>
);

/**
 * Chip clickeable con el estado de autorización del anticipo. Al hacer clic
 * abre un popover con el detalle de la solicitud y su revisión.
 */
export const AdvancePaymentApprovalBadge: React.FC<AdvancePaymentApprovalBadgeProps> = ({
  approval,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const config = STATUS_CONFIG[approval.status];

  if (!config) return null;

  const open = Boolean(anchorEl);
  const isReviewed = approval.status !== 'PENDING';

  return (
    <>
      <Chip
        icon={config.icon}
        label={config.chipLabel}
        color={config.color}
        size="small"
        variant="outlined"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        title="Ver detalle de la autorización"
        sx={{ mt: 0.5, cursor: 'pointer', fontWeight: 500 }}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 340,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 32px)',
              borderRadius: 2,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        {/* Encabezado con el color del estado */}
        <Box
          sx={(theme) => ({
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
            bgcolor: alpha(theme.palette[config.color].main, 0.12),
            borderBottom: '1px solid',
            borderColor: alpha(theme.palette[config.color].main, 0.3),
          })}
        >
          <Box sx={{ color: `${config.color}.main`, display: 'flex' }}>{config.icon}</Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ flexGrow: 1 }}>
            {config.title}
          </Typography>
          <Chip label={config.statusLabel} color={config.color} size="small" />
        </Box>

        <Stack spacing={1.75} sx={{ p: 2, overflowY: 'auto' }}>
          <DetailRow
            icon={<ScheduleIcon />}
            label="Fecha de solicitud"
            value={formatDateLong(approval.createdAt)}
          />
          <DetailRow
            icon={<PersonOutlineIcon />}
            label="Solicitante"
            value={formatUser(approval.requestedBy)}
            caption={approval.requestedBy?.email}
          />

          {approval.reason && (
            <DetailRow
              icon={<NotesIcon />}
              label="Motivo de la solicitud"
              value={approval.reason}
            />
          )}

          {isReviewed && (
            <>
              <Divider />
              <DetailRow
                icon={<PersonOutlineIcon />}
                label={config.reviewerLabel}
                value={formatUser(approval.reviewedBy)}
                caption={approval.reviewedBy?.email}
              />
              {approval.reviewedAt && (
                <DetailRow
                  icon={<EventAvailableIcon />}
                  label={config.reviewDateLabel}
                  value={formatDateLong(approval.reviewedAt)}
                />
              )}
            </>
          )}

          {approval.reviewNotes && (
            <Box
              sx={(theme) => ({
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette[config.color].main, 0.08),
                borderLeft: '3px solid',
                borderColor: `${config.color}.main`,
              })}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Notas de revisión
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {approval.reviewNotes}
              </Typography>
            </Box>
          )}

          {!isReviewed && (
            <Typography variant="caption" color="text.secondary">
              El abono se aplicará al saldo de la orden cuando Caja lo apruebe.
            </Typography>
          )}
        </Stack>
      </Popover>
    </>
  );
};
