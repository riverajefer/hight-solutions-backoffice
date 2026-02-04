import type { FC } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  size?: number;
  fullScreen?: boolean;
  message?: string;
}

/**
 * Componente de carga
 */
export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  size = 40,
  fullScreen = false,
  message,
}) => {
  if (fullScreen) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: (theme) => 
            theme.palette.mode === 'light' 
              ? 'rgba(255, 255, 255, 0.7)' 
              : 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          gap: 2,
        }}
      >
        <CircularProgress size={size} thickness={4} />
        {message && (
          <Typography
            variant="h6"
            sx={{
              color: (theme) => (theme.palette.mode === 'light' ? 'primary.main' : '#fff'),
              fontWeight: 600,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" p={4}>
      <CircularProgress size={size} />
    </Box>
  );
};
