import React from 'react';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import logo from '../../../assets/logo.png';

interface AuthCardProps {
  title: string;
  subtitle?: React.ReactNode;
  maxWidth?: number;
  children: React.ReactNode;
}

/** Tarjeta con el logo, común al login y a sus pasos del doble factor. */
export const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, maxWidth = 450, children }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Card
      sx={{
        maxWidth,
        width: '100%',
        boxShadow: isDark
          ? '0 20px 60px rgba(0, 0, 0, 0.5)'
          : '0 20px 60px rgba(102, 126, 234, 0.3)',
        bgcolor: 'background.paper',
        backgroundImage: 'none',
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box
            component="img"
            src={logo}
            alt="High Solutions"
            sx={{
              width: { xs: '180px', sm: '200px' },
              height: 'auto',
              filter: isDark
                ? 'drop-shadow(0 4px 12px rgba(46, 176, 196, 0.3))'
                : 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.3))',
            }}
          />
        </Box>

        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 700, textAlign: 'center' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="textSecondary" sx={{ mb: 4, textAlign: 'center' }}>
            {subtitle}
          </Typography>
        )}

        {children}
      </CardContent>
    </Card>
  );
};
