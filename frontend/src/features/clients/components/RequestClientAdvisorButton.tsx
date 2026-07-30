import React, { useState, useMemo } from 'react';
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
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { useUsers } from '../../users/hooks/useUsers';
import { useClientAdvisorRequests } from '../hooks/useClientAdvisorRequests';
import type { User } from '../../../types/auth.types';

const schema = z.object({
  requestedAdvisorId: z.string().min(1, 'Selecciona el asesor'),
  reason: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

type FormData = z.infer<typeof schema>;

const userLabel = (u: User): string =>
  [u.firstName, u.lastName].filter(Boolean).join(' ') ||
  u.username ||
  u.email ||
  u.id;

interface RequestClientAdvisorButtonProps {
  clientId: string;
  /** IDs de asesores ya asignados al cliente (para excluirlos de la lista) */
  existingAdvisorIds: string[];
}

export const RequestClientAdvisorButton: React.FC<
  RequestClientAdvisorButtonProps
> = ({ clientId, existingAdvisorIds }) => {
  const [open, setOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const { clientRequestsQuery, createMutation } =
    useClientAdvisorRequests(clientId);
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

  // IDs de asesores con una solicitud PENDING (para no permitir duplicados)
  const pendingAdvisorIds = useMemo(
    () =>
      (clientRequestsQuery.data ?? [])
        .filter((r) => r.status === 'PENDING')
        .map((r) => r.requestedAdvisorId),
    [clientRequestsQuery.data],
  );

  const advisorOptions: User[] = useMemo(
    () =>
      (usersQuery.data ?? []).filter(
        (u) =>
          u.isActive !== false &&
          !existingAdvisorIds.includes(u.id) &&
          !pendingAdvisorIds.includes(u.id),
      ),
    [usersQuery.data, existingAdvisorIds, pendingAdvisorIds],
  );

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync({
        clientId,
        requestedAdvisorId: data.requestedAdvisorId,
        reason: data.reason || undefined,
      });
      enqueueSnackbar(
        'Solicitud enviada. Espera la aprobación de un administrador.',
        { variant: 'info' },
      );
      handleClose();
    } catch (error: any) {
      enqueueSnackbar(
        error?.response?.data?.message ||
          'No se pudo enviar la solicitud de asignación de asesor',
        { variant: 'error' },
      );
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<PersonAddIcon />}
        onClick={handleOpen}
      >
        Asignar asesor
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Solicitar asignación de asesor</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              La asignación requiere aprobación de un administrador. Se enviará
              una notificación (incluido WhatsApp) para su autorización.
            </Alert>

            {pendingAdvisorIds.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Este cliente ya tiene {pendingAdvisorIds.length} solicitud(es) de
                asignación pendiente(s).
              </Alert>
            )}

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
                    noOptionsText="No hay asesores disponibles"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Asesor a asignar"
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
                    label="Motivo (opcional)"
                    placeholder="Ej: soy el asesor especializado en DTF para este cliente..."
                    multiline
                    rows={3}
                    fullWidth
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
