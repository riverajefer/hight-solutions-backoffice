import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * useAppVersion
 *
 * Detecta que se publicó una versión nueva del frontend mientras el usuario
 * tenía la pestaña abierta, para poder avisarle antes de que choque con un
 * chunk que ya no existe en el servidor.
 *
 * El `buildId` lo genera el plugin `versionManifest` de `vite.config.ts` a
 * partir del hash del bundle de entrada. No se inyecta en el bundle porque ese
 * hash no se conoce hasta después de compilar: en su lugar se guarda el primer
 * valor que se ve al arrancar y se compara contra los siguientes.
 *
 * Se consulta en tres momentos, y el segundo es el que de verdad importa:
 * - cada `POLL_INTERVAL_MS`,
 * - al volver el foco a la pestaña (el caso real: la pestaña abierta desde ayer),
 * - al cambiar de ruta, que es cuando se pediría un chunk nuevo.
 */

const VERSION_URL = '/version.json';

const POLL_INTERVAL_MS = 60_000;

interface VersionManifest {
  buildId?: string;
  builtAt?: string;
}

interface UseAppVersionResult {
  /** Hay una versión distinta a la que cargó esta pestaña. */
  isUpdateAvailable: boolean;
  /**
   * buildId de la versión publicada. Permite que quien avise pueda recordar
   * cuál descartó el usuario y volver a avisar solo si aparece otra distinta.
   */
  latestBuildId: string | null;
}

export function useAppVersion(): UseAppVersionResult {
  const location = useLocation();
  const [latestBuildId, setLatestBuildId] = useState<string | null>(null);

  /** buildId con el que arrancó esta pestaña. */
  const initialBuildId = useRef<string | null>(null);

  const checkVersion = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(VERSION_URL, { cache: 'no-store' });

      if (!response.ok) {
        return;
      }

      const manifest = (await response.json()) as VersionManifest;

      if (!manifest.buildId) {
        return;
      }

      if (initialBuildId.current === null) {
        initialBuildId.current = manifest.buildId;
        return;
      }

      if (manifest.buildId !== initialBuildId.current) {
        setLatestBuildId(manifest.buildId);
      }
    } catch {
      // Silencio intencional: sin red, o con un version.json ausente (por
      // ejemplo en `vite dev`), esto simplemente no hace nada.
    }
  }, []);

  useEffect(() => {
    void checkVersion();

    const interval = window.setInterval(() => {
      void checkVersion();
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkVersion]);

  // Al cambiar de ruta se comprueba también: es el momento en el que el
  // navegador pediría el chunk de la pantalla nueva.
  useEffect(() => {
    void checkVersion();
  }, [location.pathname, checkVersion]);

  return { isUpdateAvailable: latestBuildId !== null, latestBuildId };
}
