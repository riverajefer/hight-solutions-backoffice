import React from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoginDto } from '../../../types';

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <Card>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 700 }}>
          Iniciar Sesión
        </Typography>
        <Typography color="textSecondary" sx={{ mb: 4 }}>
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
            value="admin@example.com"
            fullWidth
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            disabled={isLoading}
          />

          <TextField
            label="Contraseña"
            type="password"
            value="admin123"
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
          <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              Usuarios de Prueba:
            </Typography>
            <Typography variant="caption" display="block">
              Admin: admin@example.com / admin123
            </Typography>
            <Typography variant="caption" display="block">
              Manager: manager@example.com / manager123
            </Typography>
            <Typography variant="caption" display="block">
              User: user@example.com / user123
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
