import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Box } from '@mui/material';
import { LoginForm } from '../components/LoginForm';
import { AuthCard } from '../components/AuthCard';
import { TwoFactorChallengeForm } from '../components/TwoFactorChallengeForm';
import { TwoFactorEnrollmentFlow } from '../components/TwoFactorEnrollmentFlow';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../../../store/authStore';
import { LoginDto, LoginSession } from '../../../types';
import { ROUTES } from '../../../utils/constants';

/**
 * Página de login. Después de la contraseña puede faltar el doble factor:
 * el código de la app (`challenge`) o registrarla por primera vez (`setup`).
 */
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { loginMutation } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const pendingTwoFactor = useAuthStore((s) => s.pendingTwoFactor);
  const { verifyTwoFactor, startTwoFactorEnrollment, confirmTwoFactorEnrollment, completeLogin, cancelTwoFactor } =
    useAuthStore.getState();
  // La sesión del registro se aplica solo cuando el usuario guardó sus códigos.
  const enrolledSession = React.useRef<LoginSession | null>(null);

  const from = (location.state as { from?: Location })?.from?.pathname || ROUTES.DASHBOARD;

  const enter = () => {
    enqueueSnackbar('Sesión iniciada correctamente', { variant: 'success' });
    navigate(from, { replace: true });
  };

  const handleLogin = async (credentials: LoginDto) => {
    try {
      setError(null);
      const status = await loginMutation.mutateAsync(credentials);
      if (status === 'OK') enter();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const handleVerify = async (code: string, rememberDevice: boolean) => {
    await verifyTwoFactor(code, rememberDevice);
    enter();
  };

  const handleConfirmEnrollment = async (code: string, rememberDevice: boolean) => {
    const session = await confirmTwoFactorEnrollment(code, rememberDevice);
    enrolledSession.current = session;
    return session.backupCodes ?? [];
  };

  const handleEnrollmentFinished = () => {
    if (!enrolledSession.current) return;
    completeLogin(enrolledSession.current);
    enrolledSession.current = null;
    enter();
  };

  let content: React.ReactNode;
  if (pendingTwoFactor?.kind === 'challenge') {
    content = <TwoFactorChallengeForm onVerify={handleVerify} onCancel={cancelTwoFactor} />;
  } else if (pendingTwoFactor?.kind === 'setup') {
    content = (
      <AuthCard
        title="Activa la verificación en dos pasos"
        subtitle="Tu rol exige un código del celular además de la contraseña. Solo toma un minuto."
        maxWidth={520}
      >
        <TwoFactorEnrollmentFlow
          startEnrollment={startTwoFactorEnrollment}
          confirm={handleConfirmEnrollment}
          onFinished={handleEnrollmentFinished}
          onCancel={cancelTwoFactor}
          username={pendingTwoFactor.username}
          showRememberDevice
          finishLabel="Entrar al CRM"
        />
      </AuthCard>
    );
  } else {
    content = <LoginForm onSubmit={handleLogin} isLoading={loginMutation.isPending} error={error} />;
  }

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
      {content}
    </Box>
  );
};

export default LoginPage;
