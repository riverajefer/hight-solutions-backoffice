import React, { useMemo } from 'react';
import { AuditLog } from '../../../types';
import { DataTable } from '../../../components/common/DataTable';
import { getAuditLogColumns } from '../config/columns';
import { useResponsiveColumns } from '../../../hooks';

interface AuditLogTableProps {
  auditLogs: AuditLog[];
  loading?: boolean;
  onViewDetails: (log: AuditLog) => void;
  /** Total de registros en el servidor (habilita la paginación server-side). */
  rowCount?: number;
  /** Página actual, 0-indexada. */
  currentPage?: number;
  pageSize?: number;
  onPaginationModelChange?: (model: { page: number; pageSize: number }) => void;
}

/**
 * Tabla de logs de auditoría
 * Componente de solo lectura, usa la estructura estándar de DataTable
 */
export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  auditLogs,
  loading = false,
  onViewDetails,
  rowCount,
  currentPage,
  pageSize = 20,
  onPaginationModelChange,
}) => {
  const rawColumns = useMemo(
    () => getAuditLogColumns({ onViewDetails }),
    [onViewDetails]
  );

  const columns = useResponsiveColumns(rawColumns);

  return (
    <DataTable
      density="compact"
      pageSize={pageSize}
      pageSizeOptions={[20, 50, 100]}
      rowCount={rowCount}
      currentPage={currentPage}
      onPaginationModelChange={onPaginationModelChange}
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
