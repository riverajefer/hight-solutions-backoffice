import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { TwoFactorEnrollment } from '../../../types';
import { BackupCodesPanel } from './BackupCodesPanel';
import { totpCodeSchema, totpInputProps } from './twoFactorCode';

interface TwoFactorEnrollmentFlowProps {
  /** Genera el secreto y el QR. Se llama una sola vez al montar. */
  startEnrollment: () => Promise<TwoFactorEnrollment>;
  /** Confirma el primer código; devuelve los códigos de respaldo. */
  confirm: (code: string, rememberDevice: boolean) => Promise<string[]>;
  /** Se llama cuando el usuario guardó los códigos. */
  onFinished: () => void;
  onCancel?: () => void;
  username?: string | null;
  /** Ofrecer «recordar este navegador» (solo en el login). */
  showRememberDevice?: boolean;
  finishLabel: string;
}

const confirmSchema = z.object({ code: totpCodeSchema, rememberDevice: z.boolean() });
type ConfirmValues = z.input<typeof confirmSchema>;

const Step: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
    <Box
      sx={{
        flexShrink: 0,
        width: 26,
        height: 26,
        borderRadius: '50%',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {n}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>{children}</Box>
  </Box>
);

/** Registro del doble factor: QR, primer código y códigos de respaldo. */
export const TwoFactorEnrollmentFlow: React.FC<TwoFactorEnrollmentFlowProps> = ({
  startEnrollment,
  confirm,
  onFinished,
  onCancel,
  username,
  showRememberDevice = false,
  finishLabel,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [enrollment, setEnrollment] = useState<TwoFactorEnrollment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  // Cada llamada genera un secreto nuevo y pisa el anterior: en StrictMode el
  // efecto corre dos veces y el QR mostrado podría no ser el guardado.
  const started = useRef(false);

  const load = () => {
    setLoadError(null);
    startEnrollment()
      .then(setEnrollment)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'No se pudo generar el código QR'));
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<ConfirmValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { code: '', rememberDevice: false },
  });

  const submit = useSingleFlight(async (values: ConfirmValues) => {
    setError(null);
    setIsConfirming(true);
    try {
      setBackupCodes(await confirm(values.code.replace(/\s+/g, ''), values.rememberDevice));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar el doble factor');
      resetField('code');
    } finally {
      setIsConfirming(false);
    }
  });

  const copyKey = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.manualKey.replace(/\s+/g, ''));
      enqueueSnackbar('Clave copiada', { variant: 'success' });
    } catch {
      enqueueSnackbar('No se pudo copiar la clave', { variant: 'warning' });
    }
  };

  if (backupCodes) {
    return (
      <BackupCodesPanel
        codes={backupCodes}
        username={username}
        continueLabel={finishLabel}
        onContinue={onFinished}
      />
    );
  }

  if (loadError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{loadError}</Alert>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {onCancel && <Button onClick={onCancel}>Volver</Button>}
          <Button variant="contained" onClick={load}>
            Reintentar
          </Button>
        </Stack>
      </Stack>
    );
  }

  if (!enrollment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} component="form" onSubmit={handleSubmit(submit)} noValidate>
      <Step n={1}>
        <Typography variant="body2">
          Instala <strong>Google Authenticator</strong> o <strong>Microsoft Authenticator</strong> en tu
          celular, desde la Play Store o la App Store.
        </Typography>
      </Step>

      <Step n={2}>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          En la app toca <strong>+</strong>, elige escanear un código QR y apunta la cámara aquí.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box
            component="img"
            src={enrollment.qrCodeDataUrl}
            alt="Código QR para la app autenticadora"
            sx={{ width: 200, height: 200, borderRadius: 1, bgcolor: '#fff', p: 1 }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
          ¿No puedes escanearlo? Elige «Ingresar una clave» y escribe:
        </Typography>
        <Box
          sx={{
            mt: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'action.hover',
          }}
        >
          <Typography
            sx={{ fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: 1, flex: 1, wordBreak: 'break-all' }}
          >
            {enrollment.manualKey}
          </Typography>
          <Tooltip title="Copiar clave">
            <IconButton size="small" onClick={copyKey} aria-label="Copiar clave">
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Step>

      <Step n={3}>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Escribe el código de 6 dígitos que muestra la app para «High Solutions CRM».
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Código de verificación"
          placeholder="123456"
          fullWidth
          {...register('code')}
          error={!!errors.code}
          helperText={errors.code?.message}
          disabled={isConfirming}
          inputProps={totpInputProps}
        />
        {showRememberDevice && (
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Checkbox {...register('rememberDevice')} disabled={isConfirming} />}
            label={
              <Typography variant="body2">
                No volver a pedir el código en este navegador por 30 días
              </Typography>
            }
          />
        )}
      </Step>

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        {onCancel && (
          <Button onClick={onCancel} disabled={isConfirming}>
            Cancelar
          </Button>
        )}
        <LoadingButton variant="contained" type="submit" loading={isConfirming}>
          Activar
        </LoadingButton>
      </Stack>
    </Stack>
  );
};
