import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdvancePaymentApproval } from '../../../types/order.types';

interface AdvancePaymentApprovalsListProps {
  approvals?: AdvancePaymentApproval[];
}

export const AdvancePaymentApprovalsList: React.FC<AdvancePaymentApprovalsListProps> = ({
  approvals,
}) => {
  if (!approvals || approvals.length === 0) {
    return null;
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Chip label="Pendiente" color="warning" size="small" />;
      case 'APPROVED':
        return <Chip label="Aprobada" color="success" size="small" />;
      case 'REJECTED':
        return <Chip label="Rechazada" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardHeader
        title="Historial de Autorizaciones de Anticipo"
        titleTypographyProps={{ variant: 'h6', fontSize: '1.1rem' }}
        sx={{ pb: 0 }}
      />
      <CardContent>
        <List sx={{ pt: 0 }}>
          {approvals.map((approval) => (
            <ListItem
              key={approval.id}
              alignItems="flex-start"
              sx={{
                flexDirection: 'column',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 2,
                p: 2,
                '&:last-child': { mb: 0 },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {format(new Date(approval.createdAt), "dd 'de' MMMM, yyyy HH:mm", {
                    locale: es,
                  })}
                </Typography>
                {getStatusChip(approval.status)}
              </Box>

              <ListItemText
                primary={
                  <Typography variant="body2" color="text.secondary">
                    <b>Solicitante:</b> {approval.requestedBy?.firstName} {approval.requestedBy?.lastName} ({approval.requestedBy?.email})
                  </Typography>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    {approval.reason && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <b>Motivo:</b> {approval.reason}
                      </Typography>
                    )}
                    {approval.reviewedBy && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <b>Revisado por:</b> {approval.reviewedBy.firstName} {approval.reviewedBy.lastName}
                      </Typography>
                    )}
                    {approval.reviewedAt && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <b>Fecha de revisión:</b>{' '}
                        {format(new Date(approval.reviewedAt), "dd 'de' MMMM, yyyy HH:mm", {
                          locale: es,
                        })}
                      </Typography>
                    )}
                    {approval.reviewNotes && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <b>Notas de revisión:</b> {approval.reviewNotes}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};
