import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, useTheme, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoginDto } from '../../../types';
import { showDemoCredentials } from '../../../utils/environment';
import { AuthCard } from './AuthCard';

const loginSchema = z.object({
  username: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

interface LoginFormProps {
  onSubmit: (data: LoginDto) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Formulario de login
 */
export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading = false, error }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: showDemoCredentials() ? 'adminsistema' : '',
      password: showDemoCredentials() ? 'admin123' : '',
    },
  });

  return (
    <AuthCard title="Iniciar Sesión" subtitle="Bienvenido a High Solutions CRM">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Usuario"
          type="text"
          fullWidth
          {...register('username')}
          error={!!errors.username}
          helperText={errors.username?.message}
          disabled={isLoading}
          autoComplete="username"
        />

        <TextField
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          {...register('password')}
          error={!!errors.password}
          helperText={errors.password?.message}
          disabled={isLoading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button variant="contained" type="submit" fullWidth sx={{ mt: 2 }} disabled={isLoading}>
          {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </Button>

        {/* Demo Users Info - Only shown in development environment */}
        {showDemoCredentials() && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(102, 126, 234, 0.08)',
              borderRadius: 2,
              border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(102, 126, 234, 0.2)'}`,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1, color: isDark ? 'rgba(148, 163, 184, 1)' : 'inherit' }}>
              Usuarios de Prueba:
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: isDark ? 'rgba(148, 163, 184, 0.9)' : 'inherit' }}>
              Admin: adminsistema / admin123
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: isDark ? 'rgba(148, 163, 184, 0.9)' : 'inherit' }}>
              Manager: managersistema / manager123
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: isDark ? 'rgba(148, 163, 184, 0.9)' : 'inherit' }}>
              User: usuariosistema / user123
            </Typography>
          </Box>
        )}
      </Box>
    </AuthCard>
  );
};
