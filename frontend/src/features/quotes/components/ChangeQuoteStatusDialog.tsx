import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  TextField,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { Quote, QuoteStatus, QUOTE_STATUS_CONFIG, ALLOWED_QUOTE_TRANSITIONS } from '../../../types/quote.types';

interface ChangeQuoteStatusDialogProps {
  open: boolean;
  quote: Quote | null;
  onClose: () => void;
  onConfirm: (newStatus: QuoteStatus) => Promise<void>;
  isLoading?: boolean;
}

export const ChangeQuoteStatusDialog: React.FC<ChangeQuoteStatusDialogProps> = ({
  open,
  quote,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<QuoteStatus | ''>('');

  const availableStatuses = useMemo(() => {
    if (!quote) return [];
    const nextStatuses = ALLOWED_QUOTE_TRANSITIONS[quote.status] || [];
    return nextStatuses.map((status) => ({
      value: status,
      label: QUOTE_STATUS_CONFIG[status]?.label || status,
    }));
  }, [quote]);

  useEffect(() => {
    if (quote && open) {
      const nextStatuses = ALLOWED_QUOTE_TRANSITIONS[quote.status] || [];
      setSelectedStatus(nextStatuses.length === 1 ? nextStatuses[0] : '');
    }
  }, [quote, open]);

  const handleConfirm = async () => {
    if (!selectedStatus) return;
    try {
      await onConfirm(selectedStatus as QuoteStatus);
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedStatus('');
      onClose();
    }
  };

  if (!quote) return null;

  const currentStatusLabel = QUOTE_STATUS_CONFIG[quote.status]?.label || quote.status;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cambiar Estado de Cotización</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Cotización: <strong>{quote.quoteNumber}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Estado actual: <strong>{currentStatusLabel}</strong>
          </Typography>
        </Box>

        <TextField
          select
          fullWidth
          label="Nuevo Estado"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as QuoteStatus)}
          disabled={isLoading}
          size="small"
        >
          {availableStatuses.map((option) => {
            const statusConfig = QUOTE_STATUS_CONFIG[option.value as QuoteStatus];
            const isGradient = statusConfig.color === 'gradient';
            
            return (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    label={option.label} 
                    size="small" 
                    color={isGradient ? undefined : (statusConfig.color as any)}
                    sx={{ 
                      mr: 1, 
                      height: 20,
                      ...(isGradient && {
                        background: 'linear-gradient(135deg, #2EB0C4 0%, #8B5CF6 50%, #FF2D95 100%)',
                        color: 'white',
                        border: 'none'
                      })
                    }}
                  />
                </Box>
              </MenuItem>
            );
          })}
          {availableStatuses.length === 0 && (
            <MenuItem disabled value="">
              No hay transiciones disponibles
            </MenuItem>
          )}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedStatus || isLoading}
        >
          {isLoading ? 'Cambiando...' : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
