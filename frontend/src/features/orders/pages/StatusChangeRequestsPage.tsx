import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { orderStatusChangeRequestsApi } from '../../../api/order-status-change-requests.api';
import { ORDER_STATUS_CONFIG } from '../../../types/order.types';
import type { OrderStatusChangeRequest } from '../../../types/order-status-change-request.types';

// ============================================================
// CONSTANTES
// ============================================================

const STATUS_LABELS: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aprobada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
  EXPIRED: { label: 'Expirada', color: 'default' },
};

// ============================================================
// COMPONENTE
// ============================================================

export const StatusChangeRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    request: OrderStatusChangeRequest | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, request: null, action: null });
  const [reviewNotes, setReviewNotes] = useState('');

  // Query para obtener solicitudes pendientes
  const { data: requests, isLoading } = useQuery({
    queryKey: ['statusChangeRequests', 'pending'],
    queryFn: () => orderStatusChangeRequestsApi.findPending(),
  });

  // Mutation para aprobar
  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      orderStatusChangeRequestsApi.approve(id, { reviewNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statusChangeRequests'] });
      enqueueSnackbar('Solicitud aprobada exitosamente', { variant: 'success' });
      handleCloseReviewDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al aprobar solicitud',
        { variant: 'error' }
      );
    },
  });

  // Mutation para rechazar
  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      orderStatusChangeRequestsApi.reject(id, { reviewNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statusChangeRequests'] });
      enqueueSnackbar('Solicitud rechazada', { variant: 'info' });
      handleCloseReviewDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al rechazar solicitud',
        { variant: 'error' }
      );
    },
  });

  const handleApprove = (request: OrderStatusChangeRequest) => {
    setReviewDialog({ open: true, request, action: 'approve' });
    setReviewNotes('');
  };

  const handleReject = (request: OrderStatusChangeRequest) => {
    setReviewDialog({ open: true, request, action: 'reject' });
    setReviewNotes('');
  };

  const handleConfirmReview = () => {
    if (!reviewDialog.request) return;

    if (reviewDialog.action === 'approve') {
      approveMutation.mutate({
        id: reviewDialog.request.id,
        notes: reviewNotes || undefined,
      });
    } else if (reviewDialog.action === 'reject') {
      if (!reviewNotes.trim()) {
        enqueueSnackbar('Debe proporcionar una razón para rechazar', { variant: 'warning' });
        return;
      }
      rejectMutation.mutate({
        id: reviewDialog.request.id,
        notes: reviewNotes,
      });
    }
  };

  const handleCloseReviewDialog = () => {
    setReviewDialog({ open: false, request: null, action: null });
    setReviewNotes('');
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  // ============================================================
  // COLUMNAS
  // ============================================================

  const columns: GridColDef<OrderStatusChangeRequest>[] = [
    {
      field: 'orderNumber',
      headerName: 'Nº Orden',
      width: 150,
      valueGetter: (_, row) => row.order?.orderNumber || '-',
      renderCell: (params) => (
        <Box
          sx={{ fontWeight: 600, color: 'primary.main', cursor: 'pointer' }}
          onClick={() => params.row.order && handleViewOrder(params.row.order.id)}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: 'requestedBy',
      headerName: 'Solicitado por',
      width: 200,
      valueGetter: (_, row) => {
        const user = row.requestedBy;
        return user?.firstName && user?.lastName
          ? `${user.firstName} ${user.lastName}`
          : user?.email || '-';
      },
    },
    {
      field: 'currentStatus',
      headerName: 'Estado Actual',
      width: 150,
      renderCell: (params) => {
        const config = ORDER_STATUS_CONFIG[params.value];
        return (
          <Chip
            label={config?.label || params.value}
            color={config?.color || 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'requestedStatus',
      headerName: 'Estado Solicitado',
      width: 170,
      renderCell: (params) => {
        const config = ORDER_STATUS_CONFIG[params.value];
        return (
          <Chip
            label={config?.label || params.value}
            color={config?.color || 'default'}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'reason',
      headerName: 'Razón',
      width: 250,
      renderCell: (params) => (
        <Typography variant="body2" noWrap title={params.value || ''}>
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Estado Solicitud',
      width: 130,
      renderCell: (params) => {
        const statusConfig = STATUS_LABELS[params.value] || { label: params.value, color: 'default' };
        return (
          <Chip
            label={statusConfig.label}
            color={statusConfig.color}
            size="small"
          />
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Fecha Solicitud',
      width: 150,
      valueFormatter: (value) => new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value)),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      width: 120,
      getActions: (params) => {
        if (params.row.status !== 'PENDING') {
          return [];
        }

        return [
          <GridActionsCellItem
            icon={<CheckCircleIcon />}
            label="Aprobar"
            onClick={() => handleApprove(params.row)}
            color="success"
            showInMenu={false}
          />,
          <GridActionsCellItem
            icon={<CancelIcon />}
            label="Rechazar"
            onClick={() => handleReject(params.row)}
            color="error"
            showInMenu={false}
          />,
        ];
      },
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Solicitudes de Cambio de Estado"
        subtitle="Gestionar solicitudes pendientes de aprobación"
        icon={<PendingActionsIcon />}
      />

      <Paper sx={{ p: 3 }}>
        <DataTable
          rows={requests || []}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          initialPageSize={25}
        />
      </Paper>

      {/* Dialog de revisión */}
      <Dialog open={reviewDialog.open} onClose={handleCloseReviewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reviewDialog.action === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
        </DialogTitle>
        <DialogContent>
          {reviewDialog.request && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Orden:</strong> {reviewDialog.request.order?.orderNumber}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Cambio:</strong>{' '}
                {ORDER_STATUS_CONFIG[reviewDialog.request.currentStatus]?.label} →{' '}
                {ORDER_STATUS_CONFIG[reviewDialog.request.requestedStatus]?.label}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Solicitado por:</strong>{' '}
                {reviewDialog.request.requestedBy?.firstName && reviewDialog.request.requestedBy?.lastName
                  ? `${reviewDialog.request.requestedBy.firstName} ${reviewDialog.request.requestedBy.lastName}`
                  : reviewDialog.request.requestedBy?.email}
              </Typography>
              {reviewDialog.request.reason && (
                <Typography variant="body2">
                  <strong>Razón:</strong> {reviewDialog.request.reason}
                </Typography>
              )}
            </Box>
          )}

          <TextField
            fullWidth
            multiline
            rows={4}
            label={reviewDialog.action === 'approve' ? 'Notas (opcional)' : 'Razón del rechazo *'}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={
              reviewDialog.action === 'approve'
                ? 'Agregue notas adicionales...'
                : 'Explique por qué se rechaza la solicitud...'
            }
            required={reviewDialog.action === 'reject'}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReviewDialog}>Cancelar</Button>
          <Button
            onClick={handleConfirmReview}
            variant="contained"
            color={reviewDialog.action === 'approve' ? 'success' : 'error'}
            disabled={
              approveMutation.isPending ||
              rejectMutation.isPending ||
              (reviewDialog.action === 'reject' && !reviewNotes.trim())
            }
          >
            {reviewDialog.action === 'approve' ? 'Aprobar' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StatusChangeRequestsPage;
