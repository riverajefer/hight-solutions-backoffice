import React from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useUIStore } from '../../store/uiStore';

/**
 * Componente para alternar entre tema claro y oscuro
 */
export const ThemeToggler: React.FC = () => {
  const theme = useTheme();
  const { toggleTheme } = useUIStore();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Tooltip title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
      <IconButton onClick={toggleTheme} color="inherit">
        {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  );
};
