import { useState, type FC } from 'react';
import { Alert, Button, Collapse, alpha, useTheme } from '@mui/material';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAppVersion } from '../../hooks/useAppVersion';
import { clearChunkReloadFlag } from '../../utils/chunkError';

const DISMISSED_KEY = 'hs:update-dismissed-build';

/**
 * Aviso de versión nueva publicada.
 *
 * Cuando se despliega el frontend, los archivos de la versión anterior dejan de
 * existir en el servidor. Quien tenga la pestaña abierta desde antes se topa
 * con un error al navegar a una pantalla que aún no había cargado. Este banner
 * se adelanta a eso: avisa en cuanto hay versión nueva y deja que el usuario
 * elija el momento de actualizar, sin recargar nada por su cuenta.
 *
 * Es descartable, pero solo para esa versión: si más tarde se publica otra
 * distinta, vuelve a avisar.
 */
export const UpdateAvailableBanner: FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { isUpdateAvailable, latestBuildId } = useAppVersion();

  const [dismissedBuildId, setDismissedBuildId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY);
    } catch {
      return null;
    }
  });

  const handleDismiss = () => {
    if (!latestBuildId) {
      return;
    }

    try {
      sessionStorage.setItem(DISMISSED_KEY, latestBuildId);
    } catch {
      // Sin sessionStorage el descarte dura lo que dure el montaje.
    }

    setDismissedBuildId(latestBuildId);
  };

  const handleUpdate = () => {
    // Se limpia la guardia anti-bucle para que, si la recarga se cruzara con
    // otro despliegue, la recuperación automática siga disponible.
    clearChunkReloadFlag();
    window.location.reload();
  };

  const shouldShow = isUpdateAvailable && latestBuildId !== dismissedBuildId;

  return (
    <Collapse in={shouldShow} unmountOnExit>
      <Alert
        severity="info"
        variant="outlined"
        onClose={handleDismiss}
        icon={<SystemUpdateAltIcon fontSize="small" />}
        sx={{
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          backgroundColor: isDark
            ? alpha(theme.palette.info.main, 0.12)
            : alpha(theme.palette.info.main, 0.08),
          alignItems: 'center',
          py: 0.25,
          px: 2,
          fontSize: '0.8125rem',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          '& .MuiAlert-icon': {
            py: 0,
            mr: 1,
            fontSize: '1.125rem',
          },
          '& .MuiAlert-message': {
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            minWidth: 0,
            py: 0.5,
          },
          '& .MuiAlert-action': {
            pt: 0,
            pl: { xs: 0, sm: 2 },
            ml: { xs: 0, sm: 'auto' },
            mr: { xs: 0, sm: -0.5 },
            mt: { xs: 1, sm: 0 },
            width: { xs: '100%', sm: 'auto' },
          },
        }}
        action={
          <Button
            color="info"
            size="small"
            variant="contained"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={handleUpdate}
            sx={{
              whiteSpace: 'nowrap',
              width: { xs: '100%', sm: 'auto' },
              py: 0.25,
              px: 1.25,
              fontSize: '0.75rem',
            }}
          >
            Actualizar ahora
          </Button>
        }
      >
        Hay una versión nueva del sistema. Actualiza cuando termines lo que
        estás haciendo.
      </Alert>
    </Collapse>
  );
};
