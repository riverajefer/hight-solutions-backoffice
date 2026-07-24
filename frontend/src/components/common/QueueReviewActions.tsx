import React, { useState } from 'react';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface QueueReviewActionsProps {
  /** Descripción corta de lo que se aprueba, para el diálogo de rechazo. */
  title: string;
  onApprove: (notes?: string) => Promise<void> | void;
  onReject: (notes: string) => Promise<void> | void;
  isPending?: boolean;
  /** Si ya se revisó en esta sesión, se muestra el estado en vez de los botones. */
  isProcessed?: boolean;
}

/**
 * Botones Aprobar / Rechazar para usar dentro de `ApprovalQueueBar`.
 *
 * Se usa en las bandejas cuya aprobación no existe en la página de detalle
 * (ediciones de orden, propiedad de cliente): así el admin puede revisar el
 * documento y resolver la solicitud sin devolverse a la lista.
 */
export const QueueReviewActions: React.FC<QueueReviewActionsProps> = ({
  title,
  onApprove,
  onReject,
  isPending = false,
  isProcessed = false,
}) => {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [notes, setNotes] = useState('');

  if (isProcessed) {
    return <Chip label="Ya revisada" size="small" color="success" variant="outlined" />;
  }

  const handleReject = async () => {
    if (!notes.trim()) return;
    await onReject(notes.trim());
    setRejectOpen(false);
    setNotes('');
  };

  return (
    <>
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="outlined"
          color="success"
          startIcon={<CheckCircleIcon />}
          onClick={() => onApprove()}
          disabled={isPending}
        >
          Aprobar
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<CancelIcon />}
          onClick={() => setRejectOpen(true)}
          disabled={isPending}
        >
          Rechazar
        </Button>
      </Stack>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rechazar solicitud</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {title}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Razón del rechazo"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explica por qué se rechaza la solicitud"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!notes.trim() || isPending}
          >
            Rechazar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
