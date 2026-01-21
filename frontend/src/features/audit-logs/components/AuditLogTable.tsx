import React, { useMemo } from 'react';
import { AuditLog } from '../../../types';
import { DataTable } from '../../../components/common/DataTable';
import { getAuditLogColumns } from '../config/columns';

interface AuditLogTableProps {
  auditLogs: AuditLog[];
  loading?: boolean;
  onViewDetails: (log: AuditLog) => void;
}

/**
 * Tabla de logs de auditoría
 * Componente de solo lectura, usa la estructura estándar de DataTable
 */
export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  auditLogs,
  loading = false,
  onViewDetails,
}) => {
  const columns = useMemo(
    () => getAuditLogColumns({ onViewDetails }),
    [onViewDetails]
  );

  return (
    <DataTable
      rows={auditLogs}
      columns={columns}
      loading={loading}
      getRowId={(row) => row.id}
      searchPlaceholder="Buscar en logs..."
      emptyMessage="No hay logs de auditoría disponibles"
      showExport={true}
    />
  );
};
