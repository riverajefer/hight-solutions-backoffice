import React from 'react';
import { Box, Chip, Tooltip, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { AuditLog } from '../../../types';
import { DataTable } from '../../../components/common/DataTable';
import { formatDate } from '../../../utils/helpers';

interface AuditLogTableProps {
  auditLogs: AuditLog[];
  isLoading?: boolean;
  page?: number;
  rowsPerPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onViewDetails?: (log: AuditLog) => void;
}

/**
 * Tabla de logs de auditoría
 * Componente de solo lectura, sin acciones de edición o eliminación
 */
export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  auditLogs,
  isLoading = false,
  page = 0,
  rowsPerPage = 10,
  total,
  onPageChange,
  onRowsPerPageChange,
  onViewDetails,
}) => {
  /**
   * Obtiene el color del chip según la acción
   */
  const getActionColor = (action: string): 'success' | 'info' | 'error' | 'warning' => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'created':
        return 'success';
      case 'update':
      case 'updated':
        return 'info';
      case 'delete':
      case 'deleted':
        return 'error';
      default:
        return 'warning';
    }
  };

  /**
   * Formatea el nombre de la acción
   */
  const formatAction = (action: string): string => {
    const actionMap: Record<string, string> = {
      create: 'Crear',
      created: 'Creado',
      update: 'Actualizar',
      updated: 'Actualizado',
      delete: 'Eliminar',
      deleted: 'Eliminado',
      login: 'Inicio de sesión',
      logout: 'Cierre de sesión',
    };
    return actionMap[action.toLowerCase()] || action;
  };

  /**
   * Formatea el nombre del modelo
   */
  const formatModel = (model: string): string => {
    const modelMap: Record<string, string> = {
      User: 'Usuario',
      Role: 'Rol',
      Permission: 'Permiso',
      RolePermission: 'Permiso de Rol',
    };
    return modelMap[model] || model;
  };

  const columns = [
    {
      id: 'createdAt' as keyof AuditLog,
      label: 'Fecha y Hora',
      width: '180px',
      format: (value: unknown) => formatDate(value as string),
    },
    {
      id: 'action' as keyof AuditLog,
      label: 'Acción',
      width: '120px',
      format: (value: unknown) => (
        <Chip
          label={formatAction(value as string)}
          color={getActionColor(value as string)}
          size="small"
        />
      ),
    },
    {
      id: 'model' as keyof AuditLog,
      label: 'Recurso',
      width: '150px',
      format: (value: unknown) => formatModel(value as string),
    },
    {
      id: 'userId' as keyof AuditLog,
      label: 'Usuario',
      width: '200px',
      format: (_: unknown, row?: unknown) => {
        const log = row as AuditLog;
        if (!log || !log.user) return (log?.userId) || 'Sistema';
        const fullName = `${log.user.firstName || ''} ${log.user.lastName || ''} `.trim();
        return fullName || log.user.email;
      },
    },
    {
      id: 'ipAddress' as keyof AuditLog,
      label: 'IP',
      width: '140px',
      format: (value: unknown) => value || '-',
    },
  ];

  return (
    <DataTable
      columns={columns as any}
      rows={auditLogs}
      isLoading={isLoading}
      page={page}
      rowsPerPage={rowsPerPage}
      total={total}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      emptyMessage="No hay logs de auditoría disponibles"
      getRowId={(row) => (row as AuditLog).id}
      actions={
        onViewDetails
          ? (row: unknown) => {
              const log = row as AuditLog;
              return (
                <Box display="flex" gap={1} justifyContent="center">
                  <Tooltip title="Ver detalles">
                    <IconButton
                      size="small"
                      onClick={() => onViewDetails(log)}
                      color="primary"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            }
          : undefined
      }
    />
  );
};
