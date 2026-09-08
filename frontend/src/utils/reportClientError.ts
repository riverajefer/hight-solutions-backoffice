/**
 * Report Client Error
 *
 * Envía al backend los errores de JavaScript que ocurren en el navegador, para
 * que queden en el log estructurado (y de ahí en Grafana Loki) sin depender de
 * que el usuario reporte el problema.
 *
 * Decisiones de diseño:
 * - Usa `fetch` directo, no la instancia de axios: el error a reportar puede
 *   venir precisamente de los interceptores de axios y no queremos un bucle.
 * - Nunca lanza. Si el reporte falla, falla en silencio: el objetivo es
 *   diagnosticar, jamás empeorar la pantalla que el usuario ya está viendo.
 * - Solo reporta en staging y producción; en desarrollo basta la consola.
 */

import { getApiUrl, getEnvironmentName, isProductionLike } from './environment';
import { isChunkLoadError } from './chunkError';

export type ClientErrorKind = 'render' | 'chunk' | 'unhandled';

interface ReportClientErrorOptions {
  /** Árbol de componentes de React, disponible desde un ErrorBoundary. */
  componentStack?: string;
  /** Tipo de error. Si se omite se deduce del mensaje. */
  kind?: ClientErrorKind;
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_STACK_LENGTH = 8000;

/** Tope de reportes por sesión, para no inundar el log ante un bucle de errores. */
const MAX_REPORTS_PER_SESSION = 10;

/** Ventana durante la cual un mismo error no se vuelve a reportar. */
const DEDUPE_WINDOW_MS = 60_000;

let reportCount = 0;
const recentReports = new Map<string, number>();

function truncate(value: string | undefined, max: number): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Evita reportar el mismo error una y otra vez: React puede re-renderizar
 * varias veces y un error en un intervalo dispararía cientos de peticiones.
 */
function isDuplicate(signature: string): boolean {
  const now = Date.now();
  const lastSeen = recentReports.get(signature);

  if (lastSeen !== undefined && now - lastSeen < DEDUPE_WINDOW_MS) {
    return true;
  }

  recentReports.set(signature, now);
  return false;
}

/**
 * Lee el userId de la sesión persistida por zustand, si está disponible.
 * Es informativo: el endpoint es público y el backend no lo da por verificado.
 */
function getReportedUserId(): string | undefined {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as { state?: { user?: { id?: string } } };
    return parsed.state?.user?.id;
  } catch {
    return undefined;
  }
}

/**
 * Reporta un error del navegador al backend. Nunca lanza.
 */
export function reportClientError(
  error: unknown,
  options: ReportClientErrorOptions = {},
): void {
  try {
    if (!isProductionLike()) {
      return;
    }

    if (reportCount >= MAX_REPORTS_PER_SESSION) {
      return;
    }

    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : typeof error === 'string'
          ? error
          : 'Error desconocido';

    const stack = error instanceof Error ? error.stack : undefined;

    if (isDuplicate(`${message}::${options.componentStack ?? ''}`)) {
      return;
    }

    reportCount += 1;

    const payload = {
      message: truncate(message, MAX_MESSAGE_LENGTH),
      kind:
        options.kind ?? (isChunkLoadError(error) ? 'chunk' : 'render'),
      stack: truncate(stack, MAX_STACK_LENGTH),
      componentStack: truncate(options.componentStack, MAX_STACK_LENGTH),
      url: truncate(window.location.href, MAX_MESSAGE_LENGTH),
      userId: getReportedUserId(),
      environment: getEnvironmentName(),
    };

    const endpoint = `${getApiUrl().replace(/\/$/, '')}/client-errors`;

    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // keepalive permite que la petición sobreviva si la página se recarga
      // inmediatamente después, que es justo lo que pasa con los chunks.
      keepalive: true,
    }).catch(() => {
      // Silencio intencional: no hay nada que hacer si el reporte no llega.
    });
  } catch {
    // Silencio intencional: reportar un error jamás debe generar otro.
  }
}
