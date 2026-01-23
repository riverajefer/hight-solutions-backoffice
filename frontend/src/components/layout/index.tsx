import type { FC, ReactNode } from 'react';
import { Box, Container } from '@mui/material';

export { MainLayout } from './MainLayout';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Layout para páginas de autenticación
 */
export const AuthLayout: FC<AuthLayoutProps> = ({ children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: `radial-gradient(ellipse at 15% 0%, rgba(46, 176, 196, 0.20) 0%, transparent 50%),
                    radial-gradient(ellipse at 85% 100%, rgba(139, 92, 246, 0.20) 0%, transparent 50%),
                    linear-gradient(135deg, #010100 0%, #08081a 100%)`,
      }}
    >
      <Container maxWidth="sm">
        {children}
      </Container>
    </Box>
  );
};
