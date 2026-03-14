import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  severity?: 'warning' | 'error' | 'info';
}

/**
 * Diálogo de confirmación reutilizable
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  severity = 'warning',
}) => {
  const severityColor = severity === 'error' ? 'error' : 'warning';

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          m: { xs: 2, sm: 3 },
          maxWidth: { xs: 'calc(100% - 32px)', sm: 'sm' },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: { xs: '1.125rem', sm: '1.25rem' },
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 3 },
        }}
      >
        <WarningIcon color={severityColor} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
        {title}
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ py: { xs: 1, sm: 2 }, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          {message}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, gap: { xs: 1, sm: 1.5 } }}>
        <Button onClick={onCancel} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={severityColor}
          disabled={isLoading}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
