/**
 * Saber qué fila de una tabla tiene una mutación en vuelo.
 *
 * Cuando una lista comparte un solo `useMutation` para todas sus filas,
 * `mutation.isPending` es cierto para todas a la vez, así que usarlo directo
 * pondría a girar los veinte botones. React Query v5 expone `variables` con lo
 * último que se le pasó a `mutate`, y de ahí se saca el id que está en vuelo.
 *
 * Es una **función pura, no un hook**: se llama dentro del `renderCell` de
 * DataGrid, que corre durante el render del padre. Un hook ahí violaría las
 * reglas de hooks (se llamaría un número distinto de veces según las filas).
 */

/**
 * Saca el id de las `variables` de una mutación.
 *
 * Cubre las dos formas que se usan en el proyecto: `mutate(id)` y
 * `mutate({ id, dto })`.
 */
export function mutationTargetId(variables: unknown): unknown {
  if (variables == null) return undefined;
  if (typeof variables === 'string' || typeof variables === 'number') {
    return variables;
  }
  if (typeof variables === 'object' && 'id' in variables) {
    return (variables as { id: unknown }).id;
  }
  return undefined;
}

/**
 * `true` si esta mutación está corriendo **para esta fila**.
 *
 * @param mutation Resultado de `useMutation` (basta `isPending` + `variables`).
 * @param rowId Id de la fila que se está pintando.
 * @param getId Cómo sacar el id de las `variables`, para los casos que no
 *   siguen las dos formas normales (por ejemplo `(v) => v.deductionId`).
 *
 * @example
 * <LoadingButton loading={isRowPending(approveMutation, row.id)} ... />
 */
export function isRowPending<TVars>(
  mutation: { isPending: boolean; variables?: TVars },
  rowId: unknown,
  getId: (variables: TVars) => unknown = mutationTargetId as (v: TVars) => unknown,
): boolean {
  // `isPending` va primero a propósito: `variables` sigue poblado después de
  // que la mutación termina, así que sin esta guarda el botón quedaría girando.
  if (!mutation.isPending || mutation.variables === undefined) return false;
  return getId(mutation.variables) === rowId;
}

/**
 * `true` si alguna de estas mutaciones está corriendo para esta fila.
 *
 * Sirve para bloquear el resto de acciones de la fila mientras una está en
 * curso, y que no se solapen (aprobar y rechazar el mismo registro, por decir).
 *
 * Advertencia: un `useMutation` compartido solo guarda **las últimas**
 * `variables`. Si de verdad se dispararan dos filas en paralelo, la primera
 * perdería el spinner. En la práctica no pasa porque los handlers usan
 * `useSingleFlight`; si algún día hace falta concurrencia real, toca
 * `useMutationState` con una `mutationKey` por fila.
 */
export function isAnyRowPending(
  mutations: Array<{ isPending: boolean; variables?: unknown }>,
  rowId: unknown,
): boolean {
  return mutations.some((mutation) => isRowPending(mutation, rowId));
}
