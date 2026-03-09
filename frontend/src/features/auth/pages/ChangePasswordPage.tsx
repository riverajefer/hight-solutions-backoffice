import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../../../api/auth.api';
import { useAuthStore } from '../../../store/authStore';
import { PATHS } from '../../../router/paths';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z
      .string()
      .min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
    confirmNewPassword: z.string().min(1, 'La confirmación es requerida'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword'],
  });

type ChangePasswordFormData = z.infer<typeof schema>;

/**
 * Página de cambio de contraseña obligatorio
 * Se muestra cuando el usuario debe cambiar su contraseña en el primer inicio de sesión
 */
const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { clearMustChangePassword } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      clearMustChangePassword();
      enqueueSnackbar('Contraseña actualizada correctamente', { variant: 'success' });
      navigate(PATHS.DASHBOARD, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al cambiar la contraseña';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <LockResetIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={700}>
              Cambiar Contraseña
            </Typography>
          </Box>
          <Typography color="text.secondary" mb={3}>
            Por seguridad, debes establecer una nueva contraseña antes de continuar.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label="Contraseña Actual"
              type={showCurrent ? 'text' : 'password'}
              fullWidth
              {...register('currentPassword')}
              error={!!errors.currentPassword}
              helperText={errors.currentPassword?.message}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCurrent((v) => !v)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                      disabled={isLoading}
                      aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showCurrent ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Nueva Contraseña"
              type={showNew ? 'text' : 'password'}
              fullWidth
              {...register('newPassword')}
              error={!!errors.newPassword}
              helperText={errors.newPassword?.message || 'Mínimo 6 caracteres'}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNew((v) => !v)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                      disabled={isLoading}
                      aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showNew ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Confirmar Nueva Contraseña"
              type={showConfirm ? 'text' : 'password'}
              fullWidth
              {...register('confirmNewPassword')}
              error={!!errors.confirmNewPassword}
              helperText={errors.confirmNewPassword?.message || 'Debe coincidir con la nueva contraseña'}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirm((v) => !v)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                      disabled={isLoading}
                      aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showConfirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              type="submit"
              fullWidth
              disabled={isLoading}
              sx={{ mt: 1 }}
            >
              {isLoading ? 'Guardando...' : 'Cambiar Contraseña'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ChangePasswordPage;
