import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Autocomplete,
  Alert,
  Box,
} from '@mui/material';
import { SwapHoriz as SwapHorizIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { ToolbarButton } from './ToolbarButton';
import { useAuthStore } from '../../../store/authStore';
import { useUsers } from '../../users/hooks/useUsers';
import { useAdvisorChangeRequest } from '../hooks/useAdvisorChangeRequests';
import type { User } from '../../../types/auth.types';

const schema = z.object({
  requestedAdvisorId: z.string().min(1, 'Selecciona el nuevo asesor'),
  reason: z
    .string()
    .min(10, 'Explica el motivo (al menos 10 caracteres)')
    .max(500, 'Máximo 500 caracteres'),
});

type FormData = z.infer<typeof schema>;

const userLabel = (u: User): string =>
  [u.firstName, u.lastName].filter(Boolean).join(' ') ||
  u.username ||
  u.email ||
  u.id;

interface RequestAdvisorChangeButtonProps {
  orderId: string;
  /** Asesor (creador) actual de la OP */
  currentAdvisorId: string;
  currentAdvisorName: string;
}

export const RequestAdvisorChangeButton: React.FC<
  RequestAdvisorChangeButtonProps
> = ({ orderId, currentAdvisorId, currentAdvisorName }) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const { orderRequestQuery, createMutation } =
    useAdvisorChangeRequest(orderId);
  const { usersQuery } = useUsers({ enabled: open });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { requestedAdvisorId: '', reason: '' },
  });

  const isAdmin = user?.role?.name === 'admin';
  // Los admins reasignan aprobando la solicitud desde el panel, no crean solicitud.
  if (isAdmin) {
    return null;
  }

  const pendingRequest =
    orderRequestQuery.data && orderRequestQuery.data.status === 'PENDING'
      ? orderRequestQuery.data
      : null;

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync({
        orderId,
        requestedAdvisorId: data.requestedAdvisorId,
        reason: data.reason,
      });
      enqueueSnackbar(
        'Solicitud enviada. Espere la aprobación de un administrador.',
        { variant: 'info' },
      );
      handleClose();
    } catch (error: any) {
      enqueueSnackbar(
        error?.response?.data?.message ||
          'No se pudo enviar la solicitud de cambio de asesor',
        { variant: 'error' },
      );
    }
  };

  const advisorOptions: User[] = (usersQuery.data ?? []).filter(
    (u) => u.isActive !== false && u.id !== currentAdvisorId,
  );

  return (
    <>
      <ToolbarButton
        icon={<SwapHorizIcon />}
        label="Cambiar asesor"
        onClick={handleOpen}
        disabled={!!pendingRequest}
        tooltip={
          pendingRequest
            ? 'Cambio de asesor pendiente de aprobación'
            : 'Solicitar cambio de asesor de la OP'
        }
      />

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Solicitar cambio de asesor</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              El cambio de asesor requiere aprobación de un administrador. Se
              enviará una notificación (incluido WhatsApp) para su autorización.
            </Alert>

            <TextField
              label="Asesor actual"
              value={currentAdvisorName}
              fullWidth
              disabled
              sx={{ mb: 2 }}
            />

            <Controller
              name="requestedAdvisorId"
              control={control}
              render={({ field }) => {
                const selected =
                  advisorOptions.find((u) => u.id === field.value) ?? null;
                return (
                  <Autocomplete
                    options={advisorOptions}
                    loading={usersQuery.isLoading}
                    getOptionLabel={userLabel}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    value={selected}
                    onChange={(_, val) => field.onChange(val?.id ?? '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Nuevo asesor"
                        required
                        error={!!errors.requestedAdvisorId}
                        helperText={errors.requestedAdvisorId?.message}
                      />
                    )}
                  />
                );
              }}
            />

            <Box sx={{ mt: 2 }}>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Motivo del cambio"
                    placeholder="Ej: el asesor original ya no trabaja en la empresa..."
                    multiline
                    rows={3}
                    fullWidth
                    required
                    error={!!errors.reason}
                    helperText={errors.reason?.message}
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Enviando...' : 'Enviar Solicitud'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};
