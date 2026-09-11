import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Lazy With Retry
 *
 * Envoltorio de `React.lazy` que hace dos cosas que el `lazy` de serie no hace:
 *
 * 1. **Reintenta** el `import()` antes de rendirse. Un chunk puede fallar por
 *    una microcaída de red (wifi de oficina, datos móviles) y no por un deploy;
 *    en ese caso el segundo intento suele funcionar y el usuario no se entera.
 *
 * 2. **Etiqueta el error** cuando agota los intentos: lanza un Error con
 *    `name = 'ChunkLoadError'`. Así `isChunkLoadError()` lo reconoce con
 *    certeza en vez de depender de la redacción del mensaje, que cambia según
 *    el navegador y —peor— según lo que devuelva el servidor. Con el SPA
 *    fallback el navegador recibe HTML donde espera un módulo, y el mensaje
 *    resultante no siempre coincide con los patrones conocidos.
 */

const DEFAULT_RETRIES = 2;

/** Espera creciente entre intentos: 300ms, 900ms, ... */
const BASE_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Marca el error como fallo de carga de chunk sin perder la causa original.
 */
function toChunkLoadError(cause: unknown): Error {
  const originalMessage =
    cause instanceof Error ? cause.message : String(cause ?? 'sin detalle');

  const error = new Error(
    `No se pudo cargar un recurso de la aplicación: ${originalMessage}`,
  );
  error.name = 'ChunkLoadError';
  // El `lib` de TypeScript del proyecto es anterior a ES2022, donde se tipó
  // `Error.cause`. La propiedad existe en runtime en todos los navegadores que
  // soportamos, así que se asigna con un cast puntual.
  (error as Error & { cause?: unknown }).cause = cause;

  return error;
}

/**
 * Importa un módulo reintentando ante fallos transitorios.
 */
export async function importWithRetry<T>(
  factory: () => Promise<T>,
  retries: number = DEFAULT_RETRIES,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await delay(BASE_DELAY_MS * 3 ** attempt);
      }
    }
  }

  throw toChunkLoadError(lastError);
}

/**
 * Reemplazo directo de `React.lazy` para las páginas del router.
 *
 * Uso: `const OrdersPage = lazyWithRetry(() => import('../features/...'));`
 */
// `any` es el mismo parámetro que usa la firma de `React.lazy`: acota el
// genérico a "cualquier componente" sin restringir sus props.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries: number = DEFAULT_RETRIES,
): LazyExoticComponent<T> {
  return lazy(() => importWithRetry(factory, retries));
}
