import React from 'react';
import { Box, Button, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CloseIcon from '@mui/icons-material/Close';
import type { UseApprovalQueueResult } from '../../hooks/useApprovalQueue';

interface ApprovalQueueBarProps {
  queue: UseApprovalQueueResult;
  /** Sustantivo en singular/plural para los textos: ej. ['solicitud', 'solicitudes']. */
  nouns?: [string, string];
  /** Texto de la etiqueta del siguiente elemento, para el tooltip. */
  nextLabel?: string | null;
  /**
   * Acciones de revisión (Aprobar / Rechazar) para las bandejas cuya aprobación
   * no vive en la página de detalle. Se renderizan a la izquierda de la
   * navegación.
   */
  actions?: React.ReactNode;
}

/**
 * Barra de navegación "revisar y siguiente" para colas de aprobación.
 * Se renderiza solo cuando hay una cola activa.
 */
export const ApprovalQueueBar: React.FC<ApprovalQueueBarProps> = ({
  queue,
  nouns = ['solicitud', 'solicitudes'],
  nextLabel,
  actions,
}) => {
  if (!queue.isActive) return null;

  const [singular, plural] = nouns;
  const reviewed = queue.total - queue.remaining;

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        px: 2,
        py: 1.25,
        borderRadius: 2,
        border: (theme) =>
          `1px solid ${
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
          }`,
        background: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {queue.isFinished ? (
            <TaskAltIcon fontSize="small" color="success" />
          ) : (
            <PlaylistAddCheckIcon fontSize="small" color="primary" />
          )}

          <Box>
            <Typography variant="body2" fontWeight={600}>
              {queue.isFinished
                ? `Revisaste ${queue.total === 1 ? `la ${singular}` : `las ${queue.total} ${plural}`} de la cola`
                : `Revisando ${queue.position} de ${queue.total} ${plural}`}
            </Typography>
            {!queue.isFinished && reviewed > 0 && (
              <Typography variant="caption" color="text.secondary">
                {reviewed} revisada{reviewed === 1 ? '' : 's'} · {queue.remaining} pendiente
                {queue.remaining === 1 ? '' : 's'}
              </Typography>
            )}
          </Box>

          {queue.isFinished && (
            <Chip label="Cola completa" color="success" size="small" variant="outlined" />
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {actions}

          <Button
            size="small"
            startIcon={<ChevronLeftIcon />}
            onClick={queue.goPrev}
            disabled={!queue.hasPrev}
          >
            Anterior
          </Button>

          <Tooltip title={nextLabel ? `Siguiente: ${nextLabel}` : ''} disableHoverListener={!nextLabel}>
            <span>
              <Button
                size="small"
                variant="contained"
                endIcon={<ChevronRightIcon />}
                onClick={queue.goNext}
                disabled={!queue.hasNext}
              >
                Siguiente
              </Button>
            </span>
          </Tooltip>

          <Button size="small" color="inherit" startIcon={<CloseIcon />} onClick={queue.exit}>
            Salir
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};
