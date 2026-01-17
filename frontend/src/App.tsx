import type { FC } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { lightTheme, darkTheme } from './theme';
import { useUIStore } from './store/uiStore';
import RoutesConfig from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

/**
 * Componente principal de la aplicación
 */
const AppContent: FC = () => {
  const theme = useUIStore((state) => state.theme);
  const currentTheme = theme === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <RoutesConfig />
      </SnackbarProvider>
    </ThemeProvider>
  );
};

const App: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
