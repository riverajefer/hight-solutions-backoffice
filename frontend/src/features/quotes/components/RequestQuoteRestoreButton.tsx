import React, { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import {
  Restore as RestoreIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { isAxiosError } from 'axios';
import { ToolbarButton } from '../../orders/components/ToolbarButton';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useAuthStore } from '../../../store/authStore';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { useQuoteRestoreRequest } from '../hooks/useQuoteRestoreRequest';
import { QuoteStatus, QUOTE_STATUS_CONFIG } from '../../../types/quote.types';

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Explica el motivo (al menos 10 caracteres)')
    .max(500, 'Máximo 500 caracteres'),
});

type FormData = z.infer<typeof schema>;

interface RequestQuoteRestoreButtonProps {
  quoteId: string;
  quoteNumber: string;
  /** Estado al que volverá; sin dato, el backend usa Enviada */
  rejectedFromStatus?: QuoteStatus | null;
}

/**
 * Restaurar una cotización rechazada. Los admins la restauran al instante; el
 * resto envía una solicitud que un admin autoriza (panel o WhatsApp).
 */
export const RequestQuoteRestoreButton: React.FC<
  RequestQuoteRestoreButtonProps
> = ({ quoteId, quoteNumber, rejectedFromStatus }) => {
  const [open, setOpen] = useState(false);
  const { user, hasPermission } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const { quoteRequestQuery, createMutation, restoreDirectlyMutation } =
    useQuoteRestoreRequest(quoteId);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });

  const isAdmin = user?.role?.name === 'admin';
  const canRequest = isAdmin || hasPermission('request_quote_restore');
  const activeMutation = isAdmin ? restoreDirectlyMutation : createMutation;

  const pendingRequest =
    quoteRequestQuery.data?.status === 'PENDING' ? quoteRequestQuery.data : null;

  const targetLabel =
    QUOTE_STATUS_CONFIG[rejectedFromStatus ?? QuoteStatus.SENT].label;

  const handleClose = () => {
    if (activeMutation.isPending) return;
    setOpen(false);
    reset();
  };

  const onSubmit = useSingleFlight(async (data: FormData) => {
    try {
      await activeMutation.mutateAsync({ quoteId, reason: data.reason });
      enqueueSnackbar(
        isAdmin
          ? `Cotización restaurada a «${targetLabel}».`
          : 'Solicitud enviada. Un administrador debe autorizarla.',
        { variant: isAdmin ? 'success' : 'info' },
      );
      setOpen(false);
      reset();
    } catch (error) {
      const apiMessage = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      enqueueSnackbar(
        apiMessage ||
          (isAdmin
            ? 'No se pudo restaurar la cotización'
            : 'No se pudo enviar la solicitud de restauración'),
        { variant: 'error' },
      );
    }
  });

  if (!canRequest) return null;

  return (
    <>
      <ToolbarButton
        icon={<RestoreIcon />}
        label="Restaurar"
        onClick={() => setOpen(true)}
        disabled={!isAdmin && !!pendingRequest}
        tooltip={
          !isAdmin && pendingRequest
            ? 'Restauración pendiente de autorización'
            : isAdmin
              ? 'Restaurar la cotización rechazada'
              : 'Solicitar restaurar la cotización rechazada'
        }
      />

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isAdmin ? 'Restaurar cotización' : 'Solicitar restauración'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Cotización: <strong>{quoteNumber}</strong>
            </Typography>

            <Alert severity={isAdmin ? 'warning' : 'info'} sx={{ mb: 2 }}>
              La cotización volverá al estado <strong>{targetLabel}</strong> y
              se borrará el motivo del rechazo.{' '}
              {isAdmin
                ? 'Como administrador, el cambio se aplica de inmediato y queda registrado.'
                : 'Un administrador debe autorizarlo; se le enviará la solicitud también por WhatsApp.'}
            </Alert>

            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  autoFocus
                  label="Motivo de la restauración"
                  placeholder="Ej: se rechazó por error, el cliente sigue interesado"
                  multiline
                  minRows={3}
                  fullWidth
                  required
                  error={!!errors.reason}
                  helperText={errors.reason?.message ?? `${field.value.length}/500`}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={activeMutation.isPending}>
              Cancelar
            </Button>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={activeMutation.isPending}
            >
              {isAdmin ? 'Restaurar' : 'Enviar solicitud'}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

/**
 * Aviso en el detalle cuando hay una restauración esperando autorización.
 */
export const QuoteRestoreStatusAlert: React.FC<{ quoteId: string }> = ({
  quoteId,
}) => {
  const { quoteRequestQuery } = useQuoteRestoreRequest(quoteId);
  const request = quoteRequestQuery.data;

  if (!request || request.status !== 'PENDING') return null;

  return (
    <Alert severity="warning" icon={<HourglassEmptyIcon />} sx={{ mt: 1 }}>
      <strong>Restauración pendiente de autorización.</strong> Se solicitó
      devolver esta cotización al estado{' '}
      <strong>{QUOTE_STATUS_CONFIG[request.restoreToStatus].label}</strong>. El
      cambio se aplicará cuando un administrador lo apruebe.
    </Alert>
  );
};
