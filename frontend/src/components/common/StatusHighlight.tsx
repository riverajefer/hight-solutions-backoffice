import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

type StatusColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'gradient';

interface StatusHighlightProps {
  label: string;
  color: StatusColor;
  sx?: SxProps<Theme>;
}

export const StatusHighlight: React.FC<StatusHighlightProps> = ({ label, color, sx }) => {
  const isGradient = color === 'gradient';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2.5,
        py: 1.25,
        borderRadius: 2,
        borderLeft: '5px solid',
        borderColor: (theme) => {
          if (color === 'default') return theme.palette.action.active;
          if (isGradient) return '#8B5CF6'; // Color intermedio del gradiente
          return theme.palette[color as 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'].main;
        },
        bgcolor: 'transparent',
        ...sx,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        Estado actual
      </Typography>
      <Chip
        label={label}
        color={isGradient ? undefined : (color as any)}
        variant="outlined"
        sx={{
          fontSize: '0.9rem',
          height: 34,
          fontWeight: 700,
          '& .MuiChip-label': { px: 1.5 },
          ...(isGradient && {
            background: 'linear-gradient(135deg, #2EB0C4 0%, #8B5CF6 50%, #FF2D95 100%)',
            color: 'white',
            border: 'none',
            WebkitTextFillColor: 'white', // Ensure text is visible
          }),
        }}
      />
    </Box>
  );
};
