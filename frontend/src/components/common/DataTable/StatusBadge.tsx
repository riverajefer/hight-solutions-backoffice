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
})<{ statusVariant: string }>(({ statusVariant }) => {
  const getColors = () => {
    switch (statusVariant) {
      case 'active':
        return {
          bg: '#e8f5e9',
          color: '#2e7d32',
        };
      case 'inactive':
        return {
          bg: '#f5f5f5',
          color: '#757575',
        };
      case 'pending':
        return {
          bg: '#fffde7',
          color: '#f9a825',
        };
      default:
        return {
          bg: '#f5f5f5',
          color: '#757575',
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
