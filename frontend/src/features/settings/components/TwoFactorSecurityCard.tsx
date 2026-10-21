import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PhonelinkLockIcon from '@mui/icons-material/PhonelinkLock';
import DevicesIcon from '@mui/icons-material/Devices';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { isRowPending } from '../../../utils/mutationState';
import { formatDate, formatDateTime } from '../../../utils/helpers';
import { twoFactorApi } from '../../../api';
import { useAuthStore } from '../../../store/authStore';
import { BackupCodesPanel } from '../../auth/components/BackupCodesPanel';
import { TwoFactorEnrollmentFlow } from '../../auth/components/TwoFactorEnrollmentFlow';
import { anyTwoFactorCodeSchema } from '../../auth/components/twoFactorCode';
import { useTwoFactor } from '../hooks/useTwoFactor';
import { describeUserAgent } from '../../../utils/userAgent';

const disableSchema = z.object({
  password: z.string().min(1, 'Escribe tu contraseña'),
  code: anyTwoFactorCodeSchema,
});
const codeSchema = z.object({ code: anyTwoFactorCodeSchema });

type DialogKind = 'enable' | 'disable' | 'regenerate' | null;

/** Sección «Verificación en dos pasos» del perfil. */
export const TwoFactorSecurityCard: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const username = useAuthStore((s) => s.user?.username);
  const { statusQuery, devicesQuery, refresh, disableMutation, regenerateMutation, revokeDeviceMutation } =
    useTwoFactor();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const disableForm = useForm<z.infer<typeof disableSchema>>({
    resolver: zodResolver(disableSchema),
    defaultValues: { password: '', code: '' },
  });
  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const closeDialog = () => {
    setDialog(null);
    setNewCodes(null);
    setDialogError(null);
    disableForm.reset();
    codeForm.reset();
  };

  const handleDisable = useSingleFlight(async (values: z.infer<typeof disableSchema>) => {
    setDialogError(null);
    try {
      await disableMutation.mutateAsync(values);
      enqueueSnackbar('Verificación en dos pasos desactivada', { variant: 'success' });
      closeDialog();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'No se pudo desactivar');
    }
  });

  const handleRegenerate = useSingleFlight(async (values: z.infer<typeof codeSchema>) => {
    setDialogError(null);
    try {
      const { backupCodes } = await regenerateMutation.mutateAsync(values.code);
      setNewCodes(backupCodes);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'No se pudieron generar los códigos');
    }
  });

  const handleRevoke = async (id: string) => {
    try {
      await revokeDeviceMutation.mutateAsync(id);
      enqueueSnackbar('Ese navegador volverá a pedir el código', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'No se pudo quitar el equipo', { variant: 'error' });
    }
  };

  const status = statusQuery.data;
  // Con el doble factor apagado en el servidor no hay nada que mostrar.
  if (!status || status.enforcement === 'off') return null;

  const devices = devicesQuery.data ?? [];

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <PhonelinkLockIcon color="primary" />
          <Typography variant="h6">Verificación en dos pasos</Typography>
          {status.enabled ? (
            <Chip label="Activa" color="success" size="small" />
          ) : (
            <Chip label="Inactiva" size="small" variant="outlined" />
          )}
        </Stack>
        <Divider sx={{ mb: 3 }} />

        {status.enabled ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Al entrar, además de la contraseña te pedimos el código de tu app autenticadora.
              {status.enabledAt && ` Activa desde el ${formatDate(status.enabledAt)}.`}
            </Typography>

            <Alert severity={status.backupCodesRemaining <= 3 ? 'warning' : 'info'}>
              Te {status.backupCodesRemaining === 1 ? 'queda 1 código' : `quedan ${status.backupCodesRemaining} códigos`} de
              respaldo.
              {status.backupCodesRemaining <= 3 && ' Genera códigos nuevos antes de quedarte sin ninguno.'}
            </Alert>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={() => setDialog('regenerate')}>
                Generar códigos de respaldo nuevos
              </Button>
              {!status.requiredByRole && (
                <Button variant="outlined" color="error" onClick={() => setDialog('disable')}>
                  Desactivar
                </Button>
              )}
            </Stack>
            {status.requiredByRole && (
              <Typography variant="caption" color="text.secondary">
                Tu rol exige la verificación en dos pasos, así que no se puede desactivar.
              </Typography>
            )}

            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <DevicesIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">Navegadores de confianza</Typography>
              </Stack>
              {devices.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Ninguno. Marca «No volver a pedir el código» al entrar para agregar uno.
                </Typography>
              ) : (
                <Stack divider={<Divider flexItem />} spacing={1}>
                  {devices.map((device) => (
                    <Stack
                      key={device.id}
                      direction={{ xs: 'column', sm: 'row' }}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {describeUserAgent(device.userAgent)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Último uso {formatDateTime(device.lastUsedAt)}
                          {device.ipAddress && ` · ${device.ipAddress}`} · vence {formatDate(device.expiresAt)}
                        </Typography>
                      </Box>
                      <LoadingButton
                        size="small"
                        color="error"
                        loading={isRowPending(revokeDeviceMutation, device.id)}
                        onClick={() => handleRevoke(device.id)}
                      >
                        Quitar
                      </LoadingButton>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        ) : (
          <Stack spacing={2} alignItems="flex-start">
            <Typography variant="body2" color="text.secondary">
              Protege tu cuenta pidiendo, además de la contraseña, un código de una app en tu
              celular. Si alguien conoce tu contraseña, no podrá entrar sin tu celular.
            </Typography>
            <Button variant="contained" onClick={() => setDialog('enable')}>
              Activar
            </Button>
          </Stack>
        )}
      </CardContent>

      {/* Activar */}
      <Dialog open={dialog === 'enable'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Activar la verificación en dos pasos</DialogTitle>
        <DialogContent>
          {dialog === 'enable' && (
            <TwoFactorEnrollmentFlow
              startEnrollment={() => twoFactorApi.setup()}
              confirm={async (code) => (await twoFactorApi.enable(code)).backupCodes}
              onFinished={() => {
                refresh();
                closeDialog();
                enqueueSnackbar('Verificación en dos pasos activada', { variant: 'success' });
              }}
              onCancel={closeDialog}
              username={username}
              finishLabel="Listo"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Desactivar */}
      <Dialog open={dialog === 'disable'} onClose={disableMutation.isPending ? undefined : closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Desactivar la verificación en dos pasos</DialogTitle>
        <DialogContent>
          <Stack spacing={2} component="form" onSubmit={disableForm.handleSubmit(handleDisable)} sx={{ pt: 1 }} noValidate>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            <TextField
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              {...disableForm.register('password')}
              error={!!disableForm.formState.errors.password}
              helperText={disableForm.formState.errors.password?.message}
            />
            <TextField
              label="Código de la app o de respaldo"
              autoComplete="one-time-code"
              {...disableForm.register('code')}
              error={!!disableForm.formState.errors.code}
              helperText={disableForm.formState.errors.code?.message}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={closeDialog} disabled={disableMutation.isPending}>
                Cancelar
              </Button>
              <LoadingButton type="submit" variant="contained" color="error" loading={disableMutation.isPending}>
                Desactivar
              </LoadingButton>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Regenerar códigos */}
      <Dialog
        open={dialog === 'regenerate'}
        onClose={regenerateMutation.isPending || newCodes ? undefined : closeDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Códigos de respaldo nuevos</DialogTitle>
        <DialogContent>
          {newCodes ? (
            <BackupCodesPanel codes={newCodes} username={username} continueLabel="Listo" onContinue={closeDialog} />
          ) : (
            <Stack spacing={2} component="form" onSubmit={codeForm.handleSubmit(handleRegenerate)} sx={{ pt: 1 }} noValidate>
              <Typography variant="body2" color="text.secondary">
                Los códigos anteriores dejarán de servir. Confirma con el código de tu app.
              </Typography>
              {dialogError && <Alert severity="error">{dialogError}</Alert>}
              <TextField
                label="Código de la app o de respaldo"
                autoComplete="one-time-code"
                autoFocus
                {...codeForm.register('code')}
                error={!!codeForm.formState.errors.code}
                helperText={codeForm.formState.errors.code?.message}
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button onClick={closeDialog} disabled={regenerateMutation.isPending}>
                  Cancelar
                </Button>
                <LoadingButton type="submit" variant="contained" loading={regenerateMutation.isPending}>
                  Generar
                </LoadingButton>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
