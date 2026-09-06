import { useCallback, useRef } from 'react';

/**
 * Envuelve un handler de envío para que no se ejecute dos veces a la vez.
 *
 * `disabled={mutation.isPending}` no protege del doble clic: el botón solo queda
 * deshabilitado cuando React vuelve a renderizar, y dos clics en el mismo frame
 * entran los dos. Este candado es un `ref`, así que se cierra de forma síncrona,
 * antes del primer `await`.
 *
 * Los formularios de React Hook Form **también lo necesitan**. `handleSubmit`
 * no bloquea envíos reentrantes: emite `isSubmitting: true` y ejecuta el handler
 * igual, así que dos clics en el mismo frame lo ejecutan dos veces (verificado
 * en react-hook-form 7.71.2, `createFormControl.handleSubmit`). Envuelve el
 * handler que le pasas, no el `handleSubmit`.
 *
 * @example
 * const handleSave = useSingleFlight(async () => {
 *   await createMutation.mutateAsync(payload);
 *   onClose();
 * });
 * // <Button onClick={handleSave}>Guardar</Button>
 *
 * @param submit Handler a proteger.
 * @param options.keepLockedOnSuccess Deja el candado cerrado tras un envío
 *   exitoso. Útil cuando la pantalla sigue montada después de guardar y un
 *   segundo clic volvería a enviar. Por defecto se reabre, porque lo normal es
 *   navegar o cerrar el diálogo al terminar.
 */
export function useSingleFlight<TArgs extends unknown[]>(
  submit: (...args: TArgs) => Promise<unknown> | unknown,
  options: { keepLockedOnSuccess?: boolean } = {},
): (...args: TArgs) => Promise<void> {
  const locked = useRef(false);
  const { keepLockedOnSuccess = false } = options;

  return useCallback(
    async (...args: TArgs) => {
      if (locked.current) return;
      locked.current = true;

      try {
        await submit(...args);
        if (!keepLockedOnSuccess) locked.current = false;
      } catch (error) {
        // Se reabre para que el usuario pueda corregir y reintentar. El error no
        // se relanza: estos handlers cuelgan de un `onClick`, donde una promesa
        // rechazada no la recoge nadie. Quien avisa al usuario es el `onError`
        // de la mutación, que ya corrió antes de llegar aquí.
        locked.current = false;
        console.error('[useSingleFlight] el envío falló:', error);
      }
    },
    [submit, keepLockedOnSuccess],
  );
}
