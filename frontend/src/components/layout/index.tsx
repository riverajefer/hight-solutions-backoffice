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
        backgroundColor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        {children}
      </Container>
    </Box>
  );
};
