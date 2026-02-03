import React from 'react';
import { Card, CardHeader, CardContent, CircularProgress, Box, Typography } from '@mui/material';
import { AuditLogTable } from '../../audit-logs/components/AuditLogTable';
import { useRecordHistory } from '../../audit-logs/hooks/useAuditLogs';

interface OrderChangeHistoryTabProps {
  orderId: string;
}

export const OrderChangeHistoryTab: React.FC<OrderChangeHistoryTabProps> = ({
  orderId,
}) => {
  const { data: auditLogs, isLoading, isError } = useRecordHistory(orderId);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent>
          <Typography color="error" textAlign="center">
            Error al cargar el historial de cambios
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Historial de Cambios"
        subheader="Registro completo de modificaciones realizadas a esta orden"
      />
      <CardContent>
        {auditLogs && auditLogs.length > 0 ? (
          <AuditLogTable logs={auditLogs} />
        ) : (
          <Typography color="text.secondary" textAlign="center">
            No hay cambios registrados para esta orden
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
