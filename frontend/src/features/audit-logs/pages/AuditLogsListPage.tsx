import React from 'react';
import { Box } from '@mui/material';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { AuditLogTable } from '../components/AuditLogTable';
import { AuditLogFilters } from '../components/AuditLogFilters';
import { AuditLogDetailsDialog } from '../components/AuditLogDetailsDialog';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditLog, AuditLogFilters as Filters } from '../../../types';

/**
 * Página de listado de logs de auditoría
 * Vista de solo lectura sin acciones CRUD
 */
const AuditLogsListPage: React.FC = () => {
  const [filters, setFilters] = React.useState<Filters>({
    page: 1,
    limit: 10,
  });
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

  const { auditLogsQuery } = useAuditLogs(filters);
  const auditLogs = auditLogsQuery.data?.data || [];
  const total = auditLogsQuery.data?.total || 0;

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage + 1, // MUI usa 0-indexed, backend usa 1-indexed
    }));
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setFilters((prev) => ({
      ...prev,
      limit: newRowsPerPage,
      page: 1, // Reset a la primera página
    }));
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters({
      ...newFilters,
      page: 1, // Reset a la primera página cuando cambian los filtros
      limit: filters.limit,
    });
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: filters.limit,
    });
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
  };

  const handleCloseDetails = () => {
    setSelectedLog(null);
  };

  if (auditLogsQuery.isLoading && !auditLogs.length) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title="Logs de Auditoría"
        subtitle="Visualiza el historial de acciones realizadas en el sistema"
      />

      <AuditLogFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      <AuditLogTable
        auditLogs={auditLogs}
        isLoading={auditLogsQuery.isLoading}
        page={(filters.page || 1) - 1} // Convertir a 0-indexed para MUI
        rowsPerPage={filters.limit || 10}
        total={total}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        onViewDetails={handleViewDetails}
      />

      <AuditLogDetailsDialog
        open={!!selectedLog}
        log={selectedLog}
        onClose={handleCloseDetails}
      />
    </Box>
  );
};

export default AuditLogsListPage;
