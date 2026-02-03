import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEditRequests } from '../../../hooks/useEditRequests';
import { useAuthStore } from '../../../store/authStore';
import { OrderEditRequest, EditRequestStatus } from '../../../types/edit-request.types';

interface EditRequestsListProps {
  orderId: string;
}

export const EditRequestsList: React.FC<EditRequestsListProps> = ({
  orderId,
}) => {
  const { user } = useAuthStore();
  const { requestsQuery, approveMutation, rejectMutation } =
    useEditRequests(orderId);

  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    requestId: string | null;
    action: 'approve' | 'reject' | null;
  }>({
    open: false,
    requestId: null,
    action: null,
  });
  const [reviewNotes, setReviewNotes] = useState('');

  const isAdmin = user?.role?.name === 'admin';

  const handleOpenReview = (
    requestId: string,
    action: 'approve' | 'reject',
  ) => {
    setReviewDialog({ open: true, requestId, action });
    setReviewNotes('');
  };

  const handleCloseReview = () => {
    setReviewDialog({ open: false, requestId: null, action: null });
    setReviewNotes('');
  };

  const handleSubmitReview = async () => {
    if (!reviewDialog.requestId || !reviewDialog.action) return;

    const dto = { reviewNotes: reviewNotes || undefined };

    if (reviewDialog.action === 'approve') {
      await approveMutation.mutateAsync({
        requestId: reviewDialog.requestId,
        dto,
      });
    } else {
      await rejectMutation.mutateAsync({
        requestId: reviewDialog.requestId,
        dto,
      });
    }

    handleCloseReview();
  };

  const getStatusColor = (
    status: EditRequestStatus,
  ): 'success' | 'error' | 'default' | 'warning' => {
    switch (status) {
      case EditRequestStatus.APPROVED:
        return 'success';
      case EditRequestStatus.REJECTED:
        return 'error';
      case EditRequestStatus.EXPIRED:
        return 'default';
      case EditRequestStatus.PENDING:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: EditRequestStatus): string => {
    switch (status) {
      case EditRequestStatus.APPROVED:
        return 'Aprobada';
      case EditRequestStatus.REJECTED:
        return 'Rechazada';
      case EditRequestStatus.EXPIRED:
        return 'Expirada';
      case EditRequestStatus.PENDING:
        return 'Pendiente';
      default:
        return status;
    }
  };

  if (requestsQuery.isLoading) {
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

  const requests = requestsQuery.data || [];

  return (
    <>
      <Card>
        <CardHeader title="Solicitudes de Edición" />
        <CardContent>
          {requests.length === 0 ? (
            <Typography color="text.secondary" textAlign="center">
              No hay solicitudes de edición para esta orden
            </Typography>
          ) : (
            <List>
              {requests.map((request: OrderEditRequest) => (
                <ListItem
                  key={request.id}
                  divider
                  secondaryAction={
                    isAdmin && request.status === EditRequestStatus.PENDING ? (
                      <Box display="flex" gap={1}>
                        <Tooltip title="Aprobar">
                          <IconButton
                            color="success"
                            onClick={() =>
                              handleOpenReview(request.id, 'approve')
                            }
                            disabled={
                              approveMutation.isPending ||
                              rejectMutation.isPending
                            }
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rechazar">
                          <IconButton
                            color="error"
                            onClick={() =>
                              handleOpenReview(request.id, 'reject')
                            }
                            disabled={
                              approveMutation.isPending ||
                              rejectMutation.isPending
                            }
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : null
                  }
                >
                  <ListItemText
                    primary={
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1}
                        flexWrap="wrap"
                      >
                        <Typography variant="body1">
                          {request.requestedBy.firstName ||
                            request.requestedBy.email}
                        </Typography>
                        <Chip
                          label={getStatusLabel(request.status)}
                          color={getStatusColor(request.status)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {request.observations || 'Sin observaciones'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Solicitado:{' '}
                          {format(
                            new Date(request.createdAt),
                            "dd/MM/yyyy 'a las' HH:mm",
                            { locale: es },
                          )}
                        </Typography>
                        {request.reviewedAt && request.reviewedBy && (
                          <Typography variant="caption" color="text.secondary">
                            {' '}
                            | Revisado por:{' '}
                            {request.reviewedBy.firstName ||
                              request.reviewedBy.email}{' '}
                            el{' '}
                            {format(
                              new Date(request.reviewedAt),
                              "dd/MM/yyyy 'a las' HH:mm",
                              { locale: es },
                            )}
                          </Typography>
                        )}
                        {request.reviewNotes && (
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            Notas: {request.reviewNotes}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Dialog de revisión */}
      <Dialog
        open={reviewDialog.open}
        onClose={handleCloseReview}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reviewDialog.action === 'approve'
            ? 'Aprobar Solicitud'
            : 'Rechazar Solicitud'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Notas (opcional)"
            placeholder="Agrega comentarios sobre tu decisión..."
            multiline
            rows={3}
            fullWidth
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseReview}
            disabled={
              approveMutation.isPending || rejectMutation.isPending
            }
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitReview}
            variant="contained"
            color={reviewDialog.action === 'approve' ? 'success' : 'error'}
            disabled={
              approveMutation.isPending || rejectMutation.isPending
            }
          >
            {approveMutation.isPending || rejectMutation.isPending
              ? 'Procesando...'
              : reviewDialog.action === 'approve'
                ? 'Aprobar'
                : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
