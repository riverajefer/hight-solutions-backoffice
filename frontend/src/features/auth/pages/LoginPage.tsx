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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        background: isDark
          ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      }}
    >
      <LoginForm
        onSubmit={handleLogin}
        isLoading={loginMutation.isPending}
        error={error}
      />
    </Box>
  );
};

export default LoginPage;
