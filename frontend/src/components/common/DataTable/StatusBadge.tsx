import React from 'react';
import { Chip } from '@mui/material';
import { styled } from '@mui/material/styles';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | string;
  label?: string;
  size?: 'small' | 'medium';
}

const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'statusVariant',
})<{ statusVariant: string }>(({ statusVariant, theme }) => {
  const getColors = () => {
    const mode = theme.palette.mode;
    
    switch (statusVariant) {
      case 'active':
        return {
          bg: mode === 'light' ? '#e8f5e9' : 'rgba(46, 125, 50, 0.2)',
          color: mode === 'light' ? '#2e7d32' : '#81c784',
        };
      case 'inactive':
        return {
          bg: mode === 'light' ? '#f5f5f5' : 'rgba(255, 255, 255, 0.08)',
          color: mode === 'light' ? '#757575' : '#bdbdbd',
        };
      case 'pending':
        return {
          bg: mode === 'light' ? '#fffde7' : 'rgba(249, 168, 37, 0.2)',
          color: mode === 'light' ? '#f9a825' : '#ffd54f',
        };
      default:
        return {
          bg: mode === 'light' ? '#f5f5f5' : 'rgba(255, 255, 255, 0.08)',
          color: mode === 'light' ? '#757575' : '#bdbdbd',
        };
    }
  };

  const { bg, color } = getColors();

  return {
    backgroundColor: bg,
    color: color,
    fontWeight: 600,
    fontSize: '0.75rem',
    height: 24,
    '& .MuiChip-label': {
      paddingLeft: 8,
      paddingRight: 8,
    },
  };
});

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  label, 
  size = 'small' 
}) => {
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);
  
  return (
    <StyledChip 
      label={displayLabel} 
      statusVariant={status} 
      size={size}
    />
  );
};
