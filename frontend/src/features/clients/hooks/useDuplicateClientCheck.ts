import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '../../../api/clients.api';
import { useDebounce } from '../../../hooks/useDebounce';
import type { ClientDuplicateMatch } from '../../../types';

/** Dígitos mínimos para que un documento identifique a alguien. */
const MIN_DOC_DIGITS = 6;
/** Longitud mínima del nombre antes de molestar con un aviso. */
const MIN_NAME_LENGTH = 5;

interface DuplicateCheckInput {
  name?: string;
  nit?: string;
  cedula?: string;
  /** Se apaga en modo edición: el aviso solo tiene sentido al crear. */
  enabled?: boolean;
}

/**
 * Consulta en vivo si el cliente que se está escribiendo ya existe.
 *
 * Avisa mientras el asesor llena el formulario, no al enviarlo: si el aviso
 * llega recién en el submit, ya invirtió el trabajo de completar departamento,
 * ciudad y teléfono, y ahí "Crear de todas formas" gana por inercia. Avisar al
 * escribir el documento hace mucho más probable que pida la co-propiedad.
 *
 * El backend igual valida en el `POST`; esto es solo el aviso anticipado.
 */
export const useDuplicateClientCheck = ({
  name,
  nit,
  cedula,
  enabled = true,
}: DuplicateCheckInput) => {
  const debouncedName = useDebounce(name ?? '', 500);
  const debouncedNit = useDebounce(nit ?? '', 500);
  const debouncedCedula = useDebounce(cedula ?? '', 500);

  const doc = (debouncedNit || debouncedCedula).replace(/\D/g, '');
  const hasUsableDoc = doc.length >= MIN_DOC_DIGITS;
  const hasUsableName = debouncedName.trim().length >= MIN_NAME_LENGTH;

  const query = useQuery({
    queryKey: ['clients', 'check-duplicate', debouncedName, debouncedNit, debouncedCedula],
    queryFn: () =>
      clientsApi.checkDuplicate({
        name: debouncedName || undefined,
        nit: debouncedNit || undefined,
        cedula: debouncedCedula || undefined,
      }),
    enabled: enabled && (hasUsableDoc || hasUsableName),
    // El resultado no cambia mientras el asesor sigue en el formulario, y no
    // vale la pena reconsultar al volver a la pestaña.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const matches: ClientDuplicateMatch[] = query.data ?? [];

  return { matches, isChecking: query.isFetching };
};
