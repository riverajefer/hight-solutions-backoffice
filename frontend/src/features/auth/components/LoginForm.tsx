import React from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, useTheme } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoginDto } from '../../../types';
import logo from '../../../assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    /* defaultValues: {
      email: 'admin@example.com',
      password: 'admin123',
    }, */
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <Card
      sx={{
        maxWidth: 450,
        width: '100%',
        boxShadow: isDark
          ? '0 20px 60px rgba(0, 0, 0, 0.5)'
          : '0 20px 60px rgba(102, 126, 234, 0.3)',
        bgcolor: 'background.paper',
        backgroundImage: 'none',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        {/* Logo */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <Box
            component="img"
            src={logo}
            alt="Hight Solutions"
            sx={{
              width: { xs: '180px', sm: '200px' },
              height: 'auto',
              filter: isDark
                ? 'drop-shadow(0 4px 12px rgba(46, 176, 196, 0.3))'
                : 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.3))',
            }}
          />
        </Box>

        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 700, textAlign: 'center' }}>
          Iniciar Sesión
        </Typography>
        <Typography color="textSecondary" sx={{ mb: 4, textAlign: 'center' }}>
          Bienvenido a Hight Solutions Backoffice
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            disabled={isLoading}
          />

          <TextField
            label="Contraseña"
            type="password"
            fullWidth
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            disabled={isLoading}
          />

          <Button variant="contained" type="submit" fullWidth sx={{ mt: 2 }} disabled={isLoading}>
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>

          {/* Demo Users Info */}
{/*           <Box
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
              Admin: admin@example.com / admin123
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: isDark ? 'rgba(148, 163, 184, 0.9)' : 'inherit' }}>
              Manager: manager@example.com / manager123
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: isDark ? 'rgba(148, 163, 184, 0.9)' : 'inherit' }}>
              User: user@example.com / user123
            </Typography>
          </Box> */}
        </Box>
      </CardContent>
    </Card>
  );
};
