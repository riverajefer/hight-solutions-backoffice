import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quoteRestoreRequestsApi } from '../../../api/quote-restore-requests.api';
import type { CreateQuoteRestoreRequestDto } from '../../../types/quote-restore-request.types';

export const QUOTE_RESTORE_PENDING_KEY = ['quoteRestoreRequests'];

/**
 * Flujo para restaurar una cotización rechazada.
 * Expone la solicitud pendiente de la cotización, la creación (asesores) y la
 * restauración directa (admins).
 */
export const useQuoteRestoreRequest = (quoteId?: string) => {
  const queryClient = useQueryClient();
  const quoteRequestKey = ['quote-restore-requests', 'quote', quoteId];

  const quoteRequestQuery = useQuery({
    queryKey: quoteRequestKey,
    queryFn: () => quoteRestoreRequestsApi.findByQuote(quoteId!),
    enabled: !!quoteId,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateQuoteRestoreRequestDto) =>
      quoteRestoreRequestsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteRequestKey });
      queryClient.invalidateQueries({ queryKey: QUOTE_RESTORE_PENDING_KEY });
    },
  });

  const restoreDirectlyMutation = useMutation({
    mutationFn: (dto: CreateQuoteRestoreRequestDto) =>
      quoteRestoreRequestsApi.restoreDirectly(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteRequestKey });
      queryClient.invalidateQueries({ queryKey: QUOTE_RESTORE_PENDING_KEY });
      // La cotización cambió de estado: detalle, listado y tablero
      queryClient.invalidateQueries({ queryKey: ['quote'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes-board'] });
    },
  });

  return { quoteRequestQuery, createMutation, restoreDirectlyMutation };
};
