import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { AuthCard } from './AuthCard';
import { backupCodeSchema, totpCodeSchema, totpInputProps } from './twoFactorCode';

interface TwoFactorChallengeFormProps {
  onVerify: (code: string, rememberDevice: boolean) => Promise<void>;
  onCancel: () => void;
}

const challengeSchema = z.object({ code: z.string().min(1, 'Escribe el código'), rememberDevice: z.boolean() });
type ChallengeValues = z.infer<typeof challengeSchema>;

/** Segundo paso del login: el código de la app o uno de respaldo. */
export const TwoFactorChallengeForm: React.FC<TwoFactorChallengeFormProps> = ({ onVerify, onCancel }) => {
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm<ChallengeValues>({
    resolver: zodResolver(challengeSchema),
    defaultValues: { code: '', rememberDevice: false },
  });

  const submit = useSingleFlight(async (values: ChallengeValues) => {
    // El formato depende del modo, que cambia sin volver a montar el formulario.
    const parsed = (useBackupCode ? backupCodeSchema : totpCodeSchema).safeParse(values.code);
    if (!parsed.success) {
      setFieldError('code', { message: parsed.error.issues[0]?.message });
      return;
    }

    setError(null);
    setIsVerifying(true);
    try {
      await onVerify(parsed.data, values.rememberDevice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar el código');
      reset({ code: '', rememberDevice: values.rememberDevice });
    } finally {
      setIsVerifying(false);
    }
  });

  const toggleMode = () => {
    setUseBackupCode((v) => !v);
    setError(null);
    reset({ code: '', rememberDevice: false });
  };

  return (
    <AuthCard
      title="Verificación en dos pasos"
      subtitle={
        useBackupCode
          ? 'Escribe uno de tus códigos de respaldo. Cada uno sirve una sola vez.'
          : 'Abre tu app autenticadora y escribe el código de 6 dígitos de High Solutions CRM.'
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit(submit)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        noValidate
      >
        <TextField
          key={useBackupCode ? 'backup' : 'totp'}
          label={useBackupCode ? 'Código de respaldo' : 'Código de verificación'}
          placeholder={useBackupCode ? 'ABCD-EFGH' : '123456'}
          fullWidth
          autoFocus
          {...register('code')}
          error={!!errors.code}
          helperText={errors.code?.message}
          disabled={isVerifying}
          inputProps={
            useBackupCode
              ? { autoComplete: 'off', maxLength: 9, style: { textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center' } }
              : totpInputProps
          }
        />

        <FormControlLabel
          control={<Checkbox {...register('rememberDevice')} disabled={isVerifying} />}
          label={
            <Typography variant="body2">
              No volver a pedir el código en este navegador por 30 días
            </Typography>
          }
        />

        <LoadingButton variant="contained" type="submit" fullWidth loading={isVerifying}>
          Verificar
        </LoadingButton>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Link component="button" type="button" variant="body2" onClick={toggleMode} disabled={isVerifying}>
            {useBackupCode ? 'Usar el código de la app' : '¿No tienes el celular? Usa un código de respaldo'}
          </Link>
          <Button size="small" onClick={onCancel} disabled={isVerifying}>
            Volver
          </Button>
        </Box>
      </Box>
    </AuthCard>
  );
};
