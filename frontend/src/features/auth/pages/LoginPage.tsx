import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Box, useTheme } from '@mui/material';
import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../hooks/useAuth';
import { LoginDto } from '../../../types';
import { ROUTES } from '../../../utils/constants';

/**
 * Página de login
 */
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { loginMutation } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async (credentials: LoginDto) => {
    try {
      setError(null);
      await loginMutation.mutateAsync(credentials);
      enqueueSnackbar('Sesión iniciada correctamente', { variant: 'success' });
      navigate(ROUTES.DASHBOARD);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  return (
    <LoginForm
      onSubmit={handleLogin}
      isLoading={loginMutation.isPending}
      error={error}
    />
  );
};

export default LoginPage;
