import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sessionLogsApi } from '../../../api';
import { SessionLogsFilter } from '../../../types';

export const useSessionLogs = () => {
  const [filters, setFilters] = useState<SessionLogsFilter>({
    page: 1,
    limit: 10,
  });

  const sessionLogsQuery = useQuery({
    queryKey: ['session-logs', filters],
    queryFn: () => sessionLogsApi.getAll(filters),
  });

  const activeSessionsQuery = useQuery({
    queryKey: ['session-logs', 'active'],
    queryFn: () => sessionLogsApi.getActiveSessions(),
  });

  const updateFilters = (newFilters: Partial<SessionLogsFilter>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      // Reset to page 1 when filters change (except when changing page itself)
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  };

  const changePage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
    });
  };

  return {
    sessionLogsQuery,
    activeSessionsQuery,
    filters,
    updateFilters,
    changePage,
    clearFilters,
  };
};
