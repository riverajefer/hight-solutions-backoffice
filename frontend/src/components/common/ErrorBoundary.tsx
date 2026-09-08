import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import {
  attemptChunkReload,
  clearChunkReloadFlag,
  isChunkLoadError,
} from '../../utils/chunkError';
import { isDevMode } from '../../utils/environment';
import { reportClientError } from '../../utils/reportClientError';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Cuando este valor cambia, el boundary se resetea y vuelve a renderizar
   * a sus hijos. Se usa con la ruta actual para que un error en una pantalla
   * no deje bloqueada la navegación al resto del sistema.
   */
  resetKey?: string;
  /** Ocupa toda la pantalla en lugar de acomodarse al contenedor padre. */
  fullScreen?: boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
  /** El fallo fue por un chunk que no se pudo descargar (deploy nuevo). */
  isChunkError: boolean;
  /** Copia del resetKey para detectar cambios de ruta. */
  prevResetKey?: string;
}

const INITIAL_STATE: ErrorBoundaryState = {
  error: null,
  isChunkError: false,
};

/**
 * Error Boundary de la aplicación.
 *
 * Sin un boundary, cualquier excepción durante el render desmonta el árbol
 * completo de React y el usuario ve una pantalla en blanco sin ninguna pista
 * de lo que pasó. Este componente la reemplaza por un mensaje accionable.
 *
 * Además distingue el caso más frecuente en producción —un chunk que ya no
 * existe porque se desplegó una versión nueva— y se recupera solo recargando
 * la página una única vez.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = INITIAL_STATE;

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      error,
      isChunkError: isChunkLoadError(error),
    };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    // Al navegar a otra ruta se descarta el error anterior.
    if (props.resetKey !== state.prevResetKey) {
      return { ...INITIAL_STATE, prevResetKey: props.resetKey };
    }

    return null;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Se registra siempre en consola para poder diagnosticar reportes de
    // usuarios en producción a partir de una captura de la pestaña Console.
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);

    // En staging/producción también viaja al backend, para verlo en Grafana
    // sin depender de que el usuario reporte el problema.
    reportClientError(error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });

    if (isChunkLoadError(error)) {
      // Si la recarga procede, la página se reemplaza y este render se descarta.
      // Si no (ya se recargó hace poco), cae a la pantalla de error.
      attemptChunkReload();
    }
  }

  private handleRetry = (): void => {
    this.setState(INITIAL_STATE);
  };

  private handleReload = (): void => {
    // El usuario pidió la recarga explícitamente: se limpia la guardia para
    // que un deploy posterior en esta misma sesión vuelva a auto-recuperarse.
    clearChunkReloadFlag();
    window.location.reload();
  };

  private handleGoHome = (): void => {
    clearChunkReloadFlag();
    window.location.assign('/');
  };

  render(): ReactNode {
    const { error, isChunkError } = this.state;
    const { children, fullScreen = false } = this.props;

    if (!error) {
      return children;
    }

    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        sx={
          fullScreen
            ? { minHeight: '100vh', p: 3 }
            : { minHeight: '60vh', p: { xs: 2, md: 3 } }
        }
      >
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ maxWidth: 560, width: '100%', p: { xs: 3, md: 4 } }}
        >
          <Stack spacing={2} alignItems="center" textAlign="center">
            {isChunkError ? (
              <SystemUpdateAltIcon color="info" sx={{ fontSize: 56 }} />
            ) : (
              <ErrorOutlineIcon color="error" sx={{ fontSize: 56 }} />
            )}

            <Typography variant="h6" fontWeight={600}>
              {isChunkError
                ? 'Hay una versión nueva del sistema'
                : 'Ocurrió un error inesperado'}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {isChunkError
                ? 'Tu navegador está usando una versión anterior. Actualiza la página para continuar; no perderás información guardada.'
                : 'No pudimos mostrar esta pantalla. Puedes reintentar o volver al inicio. Si vuelve a ocurrir, avísale al equipo de soporte.'}
            </Typography>

            {isDevMode() && (
              <Box
                component="pre"
                sx={{
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  p: 1.5,
                  m: 0,
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: 200,
                  backgroundColor: (theme) => theme.palette.action.hover,
                }}
              >
                {error.stack ?? `${error.name}: ${error.message}`}
              </Box>
            )}

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ pt: 1 }}
            >
              {isChunkError ? (
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReload}
                >
                  Actualizar ahora
                </Button>
              ) : (
                <>
                  <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={this.handleRetry}
                  >
                    Reintentar
                  </Button>
                  <Button variant="outlined" onClick={this.handleReload}>
                    Recargar la página
                  </Button>
                </>
              )}

              <Button
                variant="text"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
              >
                Ir al inicio
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    );
  }
}
