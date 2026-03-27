import React, { useCallback, useRef } from 'react';
import { Autocomplete, Box, Button, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useClients } from '../../../clients/hooks/useClients';
import { useUsers } from '../../../users/hooks/useUsers';
import { useAuthStore } from '../../../../store/authStore';
import { PERMISSIONS } from '../../../../utils/constants';
import type { BoardFilters } from '../../../../types/quoteKanban.types';

interface QuoteKanbanFiltersProps {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  onClear: () => void;
}

export const QuoteKanbanFilters: React.FC<QuoteKanbanFiltersProps> = ({
  filters,
  onChange,
  onClear,
}) => {
  const { hasPermission } = useAuthStore();
  const { clientsQuery } = useClients({ includeInactive: false });
  const { usersQuery } = useUsers();

  const clients = clientsQuery.data ?? [];
  const users = (usersQuery.data ?? []) as any[];

  const selectedClient = filters.clientId ? clients.find((c) => c.id === filters.clientId) ?? null : null;
  const selectedUser = filters.createdById ? users.find((u) => u.id === filters.createdById) ?? null : null;

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        onChange({ ...filters, search: value || undefined });
      }, 400);
    },
    [filters, onChange],
  );

  const hasActiveFilters = !!(
    filters.search || filters.clientId || filters.createdById || filters.dateFrom || filters.dateTo
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.5,
        alignItems: 'center',
        mb: 2,
      }}
    >
      <TextField
        label="Buscar"
        placeholder="Nº cotización o cliente..."
        size="small"
        defaultValue={filters.search ?? ''}
        onChange={(e) => handleSearchChange(e.target.value)}
        sx={{ minWidth: 200 }}
      />

      <Autocomplete
        size="small"
        options={clients}
        value={selectedClient}
        onChange={(_, val) => onChange({ ...filters, clientId: val?.id ?? undefined })}
        getOptionLabel={(opt) => opt.name}
        renderInput={(params) => <TextField {...params} label="Cliente" placeholder="Todos" />}
        loading={clientsQuery.isLoading}
        sx={{ minWidth: 220 }}
      />

      {hasPermission(PERMISSIONS.READ_ALL_QUOTES) && (
        <Autocomplete
          size="small"
          options={users}
          value={selectedUser}
          onChange={(_, val) => onChange({ ...filters, createdById: val?.id ?? undefined })}
          getOptionLabel={(opt: any) => `${opt.firstName ?? ''} ${opt.lastName ?? ''}`.trim() || opt.email}
          renderInput={(params) => <TextField {...params} label="Asesor" placeholder="Todos" />}
          loading={usersQuery.isLoading}
          sx={{ minWidth: 220 }}
        />
      )}

      <DatePicker
        label="Desde"
        value={filters.dateFrom ? new Date(filters.dateFrom) : null}
        onChange={(d) => onChange({ ...filters, dateFrom: d?.toISOString() })}
        slotProps={{ textField: { size: 'small' } }}
      />

      <DatePicker
        label="Hasta"
        value={filters.dateTo ? new Date(filters.dateTo) : null}
        onChange={(d) => onChange({ ...filters, dateTo: d?.toISOString() })}
        slotProps={{ textField: { size: 'small' } }}
      />

      {hasActiveFilters && (
        <Button variant="outlined" size="small" onClick={onClear}>
          Limpiar
        </Button>
      )}
    </Box>
  );
};
