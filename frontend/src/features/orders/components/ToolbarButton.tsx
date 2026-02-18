import React from 'react';
import { Box, Typography, Tooltip, useTheme, useMediaQuery, alpha } from '@mui/material';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  color?: string;
  tooltip?: string;
  secondaryLabel?: string;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  color,
  tooltip,
  secondaryLabel,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const activeColor = color || theme.palette.primary.main;

  return (
    <Tooltip title={tooltip || (isMobile ? label : '')} arrow placement="bottom">
      <Box
        component="button"
        onClick={onClick}
        disabled={disabled}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 1, sm: 1.25 },
          minWidth: { xs: 50, sm: 80, md: 100 },
          height: '100%',
          border: 'none',
          background: 'transparent',
          cursor: disabled ? 'default' : 'pointer',
          color: disabled ? theme.palette.text.disabled : activeColor,
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.6 : 1,
          '&:hover': {
            background: disabled 
              ? 'transparent' 
              : alpha(activeColor, theme.palette.mode === 'dark' ? 0.12 : 0.06),
            color: disabled ? theme.palette.text.disabled : activeColor,
          },
          '&:active': {
            background: alpha(activeColor, 0.1),
            transform: 'scale(0.96)',
          },
        }}
      >
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: { xs: '1.2rem', sm: '1.4rem' },
            '& svg': { fontSize: 'inherit' }
          }}
        >
          {icon}
        </Box>
        {!isMobile && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                fontSize: { sm: '0.7rem', md: '0.75rem' },
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                lineHeight: 1.2,
                display: 'block',
              }}
            >
              {label}
            </Typography>
            {secondaryLabel && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.65rem',
                  opacity: 0.8,
                  display: 'block',
                  lineHeight: 1,
                  mt: 0.2,
                }}
              >
                {secondaryLabel}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};
