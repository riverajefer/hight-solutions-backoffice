import React, { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { accountsPayableAuthRequestsApi } from '../../../api/accounts-payable-auth-requests.api';
import { ACCOUNT_PAYABLE_STATUS_CONFIG, AccountPayableStatus } from '../../../types/accounts-payable.types';

interface Props {
  open: boolean;
  onClose: () => void;
  accountPayable: {
    id: string;
    apNumber: string;
    status: AccountPayableStatus;
  };
}

export const AccountPayableAuthRequestDialog: React.FC<Props> = ({
  open,
  onClose,
  accountPayable,
}) => {
  const [reason, setReason] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: accountsPayableAuthRequestsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['ap-auth-requests-mine'] });
      enqueueSnackbar(
        'Solicitud enviada. El administrador recibirá una notificación por WhatsApp.',
        { variant: 'success' },
      );
      setReason('');
      onClose();
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al enviar la solicitud',
        { variant: 'error' },
      );
    },
  });

  const handleSubmit = () => {
    if (!reason.trim()) {
      enqueueSnackbar('Por favor ingresa una razón para la solicitud', { variant: 'warning' });
      return;
    }
    mutation.mutate({ accountPayableId: accountPayable.id, reason: reason.trim() });
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      setReason('');
      onClose();
    }
  };

  const currentStatusLabel =
    ACCOUNT_PAYABLE_STATUS_CONFIG[accountPayable.status]?.label || accountPayable.status;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Solicitar Autorización de Cuenta por Pagar</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>¿Cómo funciona esto?</strong>
          <br />
          Al enviar esta solicitud, el administrador recibirá una notificación por{' '}
          <strong>WhatsApp</strong> y podrá aprobarla directamente desde su celular. También
          podrá verla en la sección <strong>"Solicitudes Pendientes"</strong> del sistema.
          <br />
          Una vez aprobada, podrás registrar el pago de esta cuenta.
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Cuenta por Pagar:</strong> {accountPayable.apNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Estado actual:</strong> {currentStatusLabel}
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Razón de la solicitud *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explica por qué necesitas autorizar este pago..."
          disabled={mutation.isPending}
          helperText="Este campo es obligatorio"
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={mutation.isPending || !reason.trim()}
        >
          {mutation.isPending ? <CircularProgress size={24} /> : 'Enviar Solicitud'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
