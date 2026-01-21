import React from 'react';
import { Box } from '@mui/material';
import { PageHeader } from '../../../components/common/PageHeader';
import { AuditLogTable } from '../components/AuditLogTable';
import { AuditLogDetailsDialog } from '../components/AuditLogDetailsDialog';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditLog } from '../../../types';

/**
 * Página de listado de logs de auditoría
 * Vista de solo lectura que sigue la estructura estándar del sistema
 */
const AuditLogsListPage: React.FC = () => {
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

  // Obtenemos los logs sin filtros iniciales, dejando que DataTable maneje la búsqueda/paginación local
  const { auditLogsQuery } = useAuditLogs();
  
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
    <Box>
      <PageHeader
        title="Logs de Auditoría"
        subtitle="Historial detallado de todas las acciones realizadas en el sistema"
      />

      <AuditLogTable
        auditLogs={auditLogs}
        loading={auditLogsQuery.isLoading}
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
