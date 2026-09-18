import React from 'react';
import { Box } from '@mui/material';
import { PageHeader } from '../../../components/common/PageHeader';
import { AuditLogTable } from '../components/AuditLogTable';
import { AuditLogDetailsDialog } from '../components/AuditLogDetailsDialog';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditLog, AuditLogFilters } from '../../../types';

/**
 * Página de listado de logs de auditoría
 * Vista de solo lectura que sigue la estructura estándar del sistema
 */
const AuditLogsListPage: React.FC = () => {
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

  // La paginación es server-side: el backend solo devuelve la página pedida,
  // así que no basta con dejar que DataTable pagine en memoria.
  const [filters, setFilters] = React.useState<AuditLogFilters>({
    page: 1,
    limit: 20,
  });

  const { auditLogsQuery } = useAuditLogs(filters);
  
  // Extraemos los datos dependiendo de la estructura de respuesta (paginada o simple)
  const auditLogs = React.useMemo(() => {
    if (!auditLogsQuery.data) return [];
    // Si la API devuelve una estructura { data: AuditLog[], total: number }
    if ('data' in auditLogsQuery.data) {
      return (auditLogsQuery.data as any).data;
    }
    // Si la API devuelve directamente el array (caso poco probable según types, pero por seguridad)
    return Array.isArray(auditLogsQuery.data) ? auditLogsQuery.data : [];
  }, [auditLogsQuery.data]);

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
  };

  const handleCloseDetails = () => {
    setSelectedLog(null);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title="Logs de Auditoría"
        subtitle="Historial detallado de todas las acciones realizadas en el sistema"
      />

      <AuditLogTable
        auditLogs={auditLogs}
        loading={auditLogsQuery.isLoading}
        onViewDetails={handleViewDetails}
        rowCount={(auditLogsQuery.data as any)?.total ?? 0}
        currentPage={(filters.page ?? 1) - 1}
        pageSize={filters.limit ?? 20}
        onPaginationModelChange={(model) =>
          setFilters((prev) => ({
            ...prev,
            page: model.page + 1,
            limit: model.pageSize,
          }))
        }
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
