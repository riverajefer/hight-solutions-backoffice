import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, Box, Typography, alpha } from '@mui/material';
import { Timer as TimerIcon } from '@mui/icons-material';
import { useEditRequests } from '../../../hooks/useEditRequests';

interface ActivePermissionBannerProps {
  orderId: string;
}

export const ActivePermissionBanner: React.FC<
  ActivePermissionBannerProps
> = ({ orderId }) => {
  const { activePermissionQuery } = useEditRequests(orderId);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const permission = activePermissionQuery.data;

  useEffect(() => {
    if (!permission?.expiresAt) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expiresAt = new Date(permission.expiresAt!);
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expirado');
        // Invalidar query para actualizar estado
        activePermissionQuery.refetch();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    // Actualizar inmediatamente
    updateTimer();

    // Actualizar cada segundo
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [permission?.expiresAt, activePermissionQuery]);

  if (!permission) {
    return null;
  }

  return (
    <Alert
      severity="success"
      variant="standard"
      icon={<TimerIcon sx={{ fontSize: '2rem' }} />}
      sx={{
        mb: 3,
        borderRadius: 2,
        backdropFilter: 'blur(10px)',
        border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
        boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.success.main, 0.15)}`,
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
    >
      <AlertTitle sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 0.5 }}>
        Permiso de Edición Activo
      </AlertTitle>
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Tienes permiso temporal para realizar cambios en esta orden.
        </Typography>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            bgcolor: (theme) => alpha(timeRemaining === 'Expirado' ? theme.palette.error.main : theme.palette.success.main, 0.1),
            px: 1.5,
            py: 0.5,
            borderRadius: 1.5,
            border: (theme) => `1px solid ${alpha(timeRemaining === 'Expirado' ? theme.palette.error.main : theme.palette.success.main, 0.2)}`
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'text.secondary',
            }}
          >
            Tiempo restante:
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 800,
              fontFamily: 'Monospace',
              color: timeRemaining === 'Expirado' ? 'error.main' : 'success.main',
            }}
          >
            {timeRemaining}
          </Typography>
        </Box>
      </Box>
    </Alert>
  );
};
