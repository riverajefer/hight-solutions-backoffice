/**
 * Extrae los nombres de los proveedores que colisionan con el que se intenta crear.
 *
 * El backend responde 409 con `{ code: 'POSSIBLE_DUPLICATE', matches: [...] }`.
 * A diferencia de clientes, acá solo se avisa: los proveedores no tienen dueño,
 * así que no hay co-propiedad que solicitar.
 *
 * Devuelve `null` para cualquier otro error.
 */
export function extractDuplicateNames(err: unknown): string[] | null {
  const response = (err as { response?: { status?: number; data?: unknown } })
    ?.response;
  if (response?.status !== 409) return null;

  const data = response.data as
    | { code?: string; matches?: { name: string }[] }
    | undefined;
  if (data?.code !== 'POSSIBLE_DUPLICATE' || !Array.isArray(data.matches)) {
    return null;
  }
  return data.matches.map((m) => m.name);
}
