import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AuditLog } from '../../../types';
import { formatDate } from '../../../utils/helpers';

interface AuditLogDetailsDialogProps {
  open: boolean;
  log: AuditLog | null;
  onClose: () => void;
}

/**
 * Diálogo para mostrar detalles completos de un log de auditoría
 */
export const AuditLogDetailsDialog: React.FC<AuditLogDetailsDialogProps> = ({
  open,
  log,
  onClose,
}) => {
  if (!log) return null;

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

  const renderJsonData = (data: Record<string, unknown> | null, title: string) => {
    if (!data) return null;

    return (
      <Box mb={2}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Box
          sx={{
            backgroundColor: '#f5f5f5',
            p: 2,
            borderRadius: 1,
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          <pre style={{ margin: 0, fontSize: '0.875rem' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Box>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Detalles del Log de Auditoría</Typography>
          <Chip
            label={log.action}
            color={getActionColor(log.action)}
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              ID del Log
            </Typography>
            <Typography variant="body1" gutterBottom>
              {log.id}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Fecha y Hora
            </Typography>
            <Typography variant="body1" gutterBottom>
              {formatDate(log.createdAt)}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Usuario
            </Typography>
            <Typography variant="body1" gutterBottom>
              {log.user 
                ? `${log.user.firstName || ''} ${log.user.lastName || ''} (${log.user.email})`.trim()
                : log.userId || 'Sistema'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Recurso
            </Typography>
            <Typography variant="body1" gutterBottom>
              {log.model}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              ID del Registro
            </Typography>
            <Typography variant="body1" gutterBottom>
              {log.recordId}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Dirección IP
            </Typography>
            <Typography variant="body1" gutterBottom>
              {log.ipAddress || '-'}
            </Typography>
          </Grid>

          {log.userAgent && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                User Agent
              </Typography>
              <Typography variant="body2" gutterBottom>
                {log.userAgent}
              </Typography>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {log.changedFields && log.changedFields.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Campos Modificados
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {log.changedFields.map((field, index) => (
                <Chip key={index} label={field} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        {renderJsonData(log.oldData, 'Datos Anteriores')}
        {renderJsonData(log.newData, 'Datos Nuevos')}
        {renderJsonData(log.metadata, 'Metadata')}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
