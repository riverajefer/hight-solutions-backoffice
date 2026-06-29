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

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    onClick(event);
  };

  return (
    <Tooltip title={tooltip || (isMobile ? label : '')} arrow placement="bottom">
      <Box
        component="button"
        type="button"
        onClick={handleClick}
        aria-disabled={disabled}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          px: { xs: 1, sm: 1.25, md: 1.5, lg: 2 },
          py: { xs: 0.75, sm: 1 },
          minWidth: { xs: 50, sm: 66, md: 74, lg: 86 },
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
            fontSize: { xs: '1.2rem', sm: '1.25rem', md: '1.3rem', lg: '1.4rem' },
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
                fontSize: { sm: '0.62rem', md: '0.65rem', lg: '0.72rem' },
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
                  fontSize: { sm: '0.58rem', md: '0.6rem', lg: '0.63rem' } as any,
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
