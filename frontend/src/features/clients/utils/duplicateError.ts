import type { ClientDuplicateMatch } from '../../../types';

/**
 * Extrae los posibles duplicados de un error de axios.
 *
 * El backend responde 409 con `{ code: 'POSSIBLE_DUPLICATE', matches: [...] }`
 * cuando el cliente que se intenta crear ya podría existir. Ese 409 no es un
 * fallo a mostrar en rojo: es el aviso que abre el diálogo de co-propiedad.
 *
 * Devuelve `null` para cualquier otro error, que sigue el camino normal.
 */
export function extractDuplicateMatches(
  err: unknown,
): ClientDuplicateMatch[] | null {
  const response = (err as { response?: { status?: number; data?: unknown } })
    ?.response;
  if (response?.status !== 409) return null;

  const data = response.data as
    | { code?: string; matches?: ClientDuplicateMatch[] }
    | undefined;
  if (data?.code !== 'POSSIBLE_DUPLICATE' || !Array.isArray(data.matches)) {
    return null;
  }
  return data.matches;
}
