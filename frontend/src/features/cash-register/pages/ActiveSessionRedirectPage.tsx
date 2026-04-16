import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useCashSessions } from '../hooks/useCashRegister';
import { PATHS } from '../../../router/paths';

const ActiveSessionRedirectPage: React.FC = () => {
  const navigate = useNavigate();

  // Fetch open sessions
  const { data: response, isLoading, isError } = useCashSessions({
    status: 'OPEN',
  });

  useEffect(() => {
    if (!isLoading) {
      if (isError) {
        return;
      }

      const activeSessions = response?.data || [];
      if (activeSessions.length > 0) {
        // Redirect to the first found active session
        navigate(PATHS.CASH_SESSION_ACTIVE.replace(':id', activeSessions[0].id), { replace: true });
      } else {
        // Redirect to cash session history or open session if none is active
        navigate(PATHS.CASH_SESSION_HISTORY, { replace: true });
      }
    }
  }, [response, isLoading, isError, navigate]);

  if (isError) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Alert severity="error">Error al buscar la sesión activa. Por favor, intente nuevamente.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
      <CircularProgress />
      <Typography variant="body1" color="text.secondary">
        Buscando sesión activa...
      </Typography>
    </Box>
  );
};

export default ActiveSessionRedirectPage;
