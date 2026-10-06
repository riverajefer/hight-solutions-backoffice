import { useCallback, useEffect, useState } from 'react';
import type { BoardFilters } from '../../../types/production-board.types';
import { DEFAULT_BOARD_FILTERS } from '../boardConfig';

/**
 * Los filtros del tablero se recuerdan entre visitas, igual que en la lista de
 * órdenes: cada puesto suele trabajar todo el día acotado a su área o asesor.
 */
const FILTERS_STORAGE_KEY = 'production_board_filters_v1';

const loadPersistedFilters = (): BoardFilters => {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return DEFAULT_BOARD_FILTERS;
    const parsed = JSON.parse(raw) as Partial<BoardFilters>;
    return {
      ...DEFAULT_BOARD_FILTERS,
      ...parsed,
      advisorIds: Array.isArray(parsed.advisorIds) ? parsed.advisorIds : [],
    };
  } catch {
    return DEFAULT_BOARD_FILTERS;
  }
};

/** La vista y «mostrar borradores» son preferencias, no filtros que oculten órdenes. */
export const countActiveFilters = (filters: BoardFilters): number =>
  [
    filters.advisorIds.length > 0,
    !!filters.areaId,
    !!filters.minTotal,
    filters.hideCounterSales,
    !!filters.semaphore,
    !!filters.search.trim(),
  ].filter(Boolean).length;

export const useBoardFilters = () => {
  const [filters, setFilters] = useState<BoardFilters>(loadPersistedFilters);

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      /* localStorage no disponible: seguimos sin persistir */
    }
  }, [filters]);

  const updateFilters = useCallback((changes: Partial<BoardFilters>) => {
    setFilters((current) => ({ ...current, ...changes }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters((current) => ({
      ...DEFAULT_BOARD_FILTERS,
      view: current.view,
      showDrafts: current.showDrafts,
    }));
  }, []);

  return {
    filters,
    updateFilters,
    clearFilters,
    activeFiltersCount: countActiveFilters(filters),
  };
};
