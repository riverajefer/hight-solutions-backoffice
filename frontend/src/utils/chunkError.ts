/**
 * Chunk Error Utility
 *
 * Detecta y gestiona los fallos de carga de chunks (code-splitting).
 *
 * Contexto: el router carga ~100 páginas con `lazy()` y Vite les asigna un hash
 * en el nombre del archivo. Al desplegar una versión nueva, los archivos de la
 * versión anterior dejan de existir en el servidor. Un usuario que tenía la
 * pestaña abierta desde antes del deploy pide un chunk que ya no está y, como
 * el frontend se sirve con `serve -s` (SPA fallback), recibe el `index.html`
 * en lugar de un 404. El navegador lo rechaza por MIME type, la promesa del
 * `lazy()` falla y la pantalla queda en blanco.
 *
 * La solución es recargar la página una sola vez para traer el manifiesto nuevo.
 */

const RELOAD_FLAG_KEY = 'hs:chunk-reload-at';

/**
 * Ventana durante la cual NO se vuelve a recargar automáticamente.
 * Evita un bucle infinito si el fallo no es por un deploy sino porque el
 * servidor de assets está caído de verdad.
 */
const RELOAD_COOLDOWN_MS = 30_000;

/**
 * Mensajes que emiten los distintos navegadores cuando un módulo dinámico
 * no se puede cargar. Cada motor usa su propia redacción.
 */
const CHUNK_ERROR_PATTERNS: RegExp[] = [
  // Vite / Chrome
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /failed to load module script/i,
  // Chrome cuando el servidor responde el index.html en vez del .js
  /expected a javascript(-or-wasm)? module script/i,
  /is not a valid javascript mime type/i,
  // Safari
  /importing a module script failed/i,
  // Firefox
  /error resolving module specifier/i,
  /loading failed for the module with source/i,
  // Webpack-style (por si alguna dependencia lo emite)
  /loading chunk [\w-]+ failed/i,
  /chunkloaderror/i,
];

/**
 * Determina si un error corresponde a un chunk que no se pudo descargar.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (error instanceof Error && error.name === 'ChunkLoadError') {
    return true;
  }

  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : '';

  if (!message) {
    return false;
  }

  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Lee el timestamp del último intento de recarga automática.
 * sessionStorage puede lanzar en modo privado o con cookies bloqueadas.
 */
function getLastReloadAt(): number | null {
  try {
    const raw = sessionStorage.getItem(RELOAD_FLAG_KEY);
    if (!raw) {
      return null;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Indica si se puede intentar una recarga automática.
 * Devuelve false si ya se recargó hace poco, para no entrar en bucle.
 */
export function canAttemptChunkReload(): boolean {
  const lastReloadAt = getLastReloadAt();

  if (lastReloadAt === null) {
    return true;
  }

  return Date.now() - lastReloadAt > RELOAD_COOLDOWN_MS;
}

/**
 * Marca el intento y recarga la página.
 *
 * Retorna false si no se debía recargar (cooldown activo), de modo que quien
 * llama pueda mostrar la pantalla de error en su lugar.
 */
export function attemptChunkReload(): boolean {
  if (!canAttemptChunkReload()) {
    return false;
  }

  try {
    sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
  } catch {
    // Sin sessionStorage no hay guardia contra bucles: mejor no auto-recargar
    // y dejar que el usuario decida con el botón de la pantalla de error.
    return false;
  }

  window.location.reload();
  return true;
}

/**
 * Limpia la marca de recarga. Se llama cuando la app arranca correctamente,
 * para que un deploy posterior en la misma sesión vuelva a auto-recuperarse.
 */
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG_KEY);
  } catch {
    // Ignorado a propósito: es una limpieza best-effort.
  }
}
