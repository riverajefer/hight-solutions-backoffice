import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, Box, Typography } from '@mui/material';
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
      icon={<TimerIcon />}
      sx={{ mb: 3, backgroundColor: '#1c2b1dff' }}
    >
      <AlertTitle sx={{ fontWeight: 'bold', color: 'text.dark' }}>
        Permiso de Edición Activo
      </AlertTitle>
      <Box display="flex" alignItems="center" gap={2}>
        <Typography variant="body2" color="text.secondary">
          Tienes permiso para editar esta orden.
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'bold',
            color: timeRemaining === 'Expirado' ? 'error.main' : 'success.dark',
          }}
        >
          Tiempo restante: {timeRemaining}
        </Typography>
      </Box>
    </Alert>
  );
};
