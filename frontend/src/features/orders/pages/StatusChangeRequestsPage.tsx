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
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { useAuthStore } from '../../../store/authStore';
import { orderStatusChangeRequestsApi } from '../../../api/order-status-change-requests.api';
import { editRequestsApi } from '../../../api/edit-requests.api';
import { expenseOrderAuthRequestsApi } from '../../../api/expense-order-auth-requests.api';
import { ORDER_STATUS_CONFIG, type OrderStatus } from '../../../types/order.types';
import { EXPENSE_ORDER_STATUS_CONFIG, ExpenseOrderStatus } from '../../../types/expense-order.types';
import type { OrderStatusChangeRequest } from '../../../types/order-status-change-request.types';
import type { OrderEditRequest } from '../../../types/edit-request.types';
import type { ExpenseOrderAuthRequest } from '../../../types/expense-order-auth-request.types';

// ============================================================
// CONSTANTES
// ============================================================

const STATUS_LABELS: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aprobada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
  EXPIRED: { label: 'Expirada', color: 'default' },
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const getUserName = (user?: { firstName: string | null; lastName: string | null; email: string }) => {
  if (!user) return '-';
  return user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email;
};

// ============================================================
// COMPONENTE
// ============================================================

export const StatusChangeRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role?.name === 'admin';

  const [tabValue, setTabValue] = useState(0);

  // --- Status Change Requests ---
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    request: OrderStatusChangeRequest | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, request: null, action: null });
  const [reviewNotes, setReviewNotes] = useState('');

  // --- Edit Requests ---
  const [editReviewDialog, setEditReviewDialog] = useState<{
    open: boolean;
    request: OrderEditRequest | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, request: null, action: null });
  const [editReviewNotes, setEditReviewNotes] = useState('');

  // --- Expense Order Auth Requests ---
  const [ogAuthReviewDialog, setOgAuthReviewDialog] = useState<{
    open: boolean;
    request: ExpenseOrderAuthRequest | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, request: null, action: null });
  const [ogAuthReviewNotes, setOgAuthReviewNotes] = useState('');

  // ============================================================
  // QUERIES
  // ============================================================

  const { data: statusRequests, isLoading: statusLoading } = useQuery({
    queryKey: ['statusChangeRequests', 'pending'],
    queryFn: () => orderStatusChangeRequestsApi.findPending(),
  });

  const { data: editRequests, isLoading: editLoading } = useQuery({
    queryKey: ['editRequests', 'pending'],
    queryFn: () => editRequestsApi.findAllPending(),
  });

  const { data: ogAuthRequests, isLoading: ogAuthLoading } = useQuery({
    queryKey: ['ogAuthRequests', 'pending'],
    queryFn: () => expenseOrderAuthRequestsApi.findPending(),
    enabled: isAdmin,
  });

  // ============================================================
  // STATUS CHANGE MUTATIONS
  // ============================================================

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

  // ============================================================
  // EDIT REQUEST MUTATIONS
  // ============================================================

  const approveEditMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      editRequestsApi.approveGlobal(id, { reviewNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editRequests'] });
      queryClient.invalidateQueries({ queryKey: ['edit-requests'] });
      enqueueSnackbar('Solicitud de edición aprobada exitosamente', { variant: 'success' });
      handleCloseEditReviewDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al aprobar solicitud',
        { variant: 'error' }
      );
    },
  });

  const rejectEditMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      editRequestsApi.rejectGlobal(id, { reviewNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editRequests'] });
      queryClient.invalidateQueries({ queryKey: ['edit-requests'] });
      enqueueSnackbar('Solicitud de edición rechazada', { variant: 'info' });
      handleCloseEditReviewDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al rechazar solicitud',
        { variant: 'error' }
      );
    },
  });

  // ============================================================
  // OG AUTH REQUEST MUTATIONS
  // ============================================================

  const approveOgAuthMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      expenseOrderAuthRequestsApi.approve(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ogAuthRequests'] });
      enqueueSnackbar('Solicitud de autorización aprobada', { variant: 'success' });
      handleCloseOgAuthReviewDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al aprobar solicitud',
        { variant: 'error' }
      );
    },
  });

  const rejectOgAuthMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      expenseOrderAuthRequestsApi.reject(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ogAuthRequests'] });
      enqueueSnackbar('Solicitud de autorización rechazada', { variant: 'info' });
      handleCloseOgAuthReviewDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.message || 'Error al rechazar solicitud',
        { variant: 'error' }
      );
    },
  });

  // ============================================================
  // HANDLERS - STATUS CHANGE
  // ============================================================

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

  // ============================================================
  // HANDLERS - EDIT REQUESTS
  // ============================================================

  const handleApproveEdit = (request: OrderEditRequest) => {
    setEditReviewDialog({ open: true, request, action: 'approve' });
    setEditReviewNotes('');
  };

  const handleRejectEdit = (request: OrderEditRequest) => {
    setEditReviewDialog({ open: true, request, action: 'reject' });
    setEditReviewNotes('');
  };

  const handleConfirmEditReview = () => {
    if (!editReviewDialog.request) return;

    if (editReviewDialog.action === 'approve') {
      approveEditMutation.mutate({
        id: editReviewDialog.request.id,
        notes: editReviewNotes || undefined,
      });
    } else if (editReviewDialog.action === 'reject') {
      if (!editReviewNotes.trim()) {
        enqueueSnackbar('Debe proporcionar una razón para rechazar', { variant: 'warning' });
        return;
      }
      rejectEditMutation.mutate({
        id: editReviewDialog.request.id,
        notes: editReviewNotes,
      });
    }
  };

  const handleCloseEditReviewDialog = () => {
    setEditReviewDialog({ open: false, request: null, action: null });
    setEditReviewNotes('');
  };

  // ============================================================
  // HANDLERS - OG AUTH REQUESTS
  // ============================================================

  const handleApproveOgAuth = (request: ExpenseOrderAuthRequest) => {
    setOgAuthReviewDialog({ open: true, request, action: 'approve' });
    setOgAuthReviewNotes('');
  };

  const handleRejectOgAuth = (request: ExpenseOrderAuthRequest) => {
    setOgAuthReviewDialog({ open: true, request, action: 'reject' });
    setOgAuthReviewNotes('');
  };

  const handleConfirmOgAuthReview = () => {
    if (!ogAuthReviewDialog.request) return;

    if (ogAuthReviewDialog.action === 'approve') {
      approveOgAuthMutation.mutate({
        id: ogAuthReviewDialog.request.id,
        notes: ogAuthReviewNotes || undefined,
      });
    } else if (ogAuthReviewDialog.action === 'reject') {
      if (!ogAuthReviewNotes.trim()) {
        enqueueSnackbar('Debe proporcionar una razón para rechazar', { variant: 'warning' });
        return;
      }
      rejectOgAuthMutation.mutate({
        id: ogAuthReviewDialog.request.id,
        notes: ogAuthReviewNotes,
      });
    }
  };

  const handleCloseOgAuthReviewDialog = () => {
    setOgAuthReviewDialog({ open: false, request: null, action: null });
    setOgAuthReviewNotes('');
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handleViewExpenseOrder = (expenseOrderId: string) => {
    navigate(`/expense-orders/${expenseOrderId}`);
  };

  // ============================================================
  // COLUMNAS - STATUS CHANGE REQUESTS
  // ============================================================

  const statusColumns: GridColDef<OrderStatusChangeRequest>[] = [
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
      valueGetter: (_, row) => getUserName(row.requestedBy),
    },
    {
      field: 'currentStatus',
      headerName: 'Estado Actual',
      width: 150,
      renderCell: (params) => {
        const value = params.value as OrderStatus;
        const config = ORDER_STATUS_CONFIG[value];
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
        const value = params.value as OrderStatus;
        const config = ORDER_STATUS_CONFIG[value];
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
      valueFormatter: (value) => formatDateTime(value),
    },
    ...(isAdmin ? [{
      field: 'actions',
      type: 'actions' as const,
      headerName: 'Acciones',
      width: 120,
      getActions: (params: any) => {
        if (params.row.status !== 'PENDING') {
          return [];
        }

        return [
          <GridActionsCellItem
            icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
            label="Aprobar"
            onClick={() => handleApprove(params.row)}
            showInMenu={false}
          />,
          <GridActionsCellItem
            icon={<CancelIcon sx={{ color: 'error.main' }} />}
            label="Rechazar"
            onClick={() => handleReject(params.row)}
            showInMenu={false}
          />,
        ];
      },
    }] : []),
  ];

  // ============================================================
  // COLUMNAS - EDIT REQUESTS
  // ============================================================

  const editColumns: GridColDef<OrderEditRequest>[] = [
    {
      field: 'orderNumber',
      headerName: 'Nº Orden',
      width: 150,
      valueGetter: (_, row) => row.order?.orderNumber || '-',
      renderCell: (params) => (
        <Box
          sx={{ fontWeight: 600, color: 'primary.main', cursor: 'pointer' }}
          onClick={() => params.row.orderId && handleViewOrder(params.row.orderId)}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: 'requestedBy',
      headerName: 'Solicitado por',
      width: 200,
      valueGetter: (_, row) => getUserName(row.requestedBy),
    },
    {
      field: 'observations',
      headerName: 'Observaciones',
      width: 300,
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
      width: 170,
      valueFormatter: (value) => formatDateTime(value),
    },
    ...(isAdmin ? [{
      field: 'actions',
      type: 'actions' as const,
      headerName: 'Acciones',
      width: 120,
      getActions: (params: any) => {
        if (params.row.status !== 'PENDING') {
          return [];
        }

        return [
          <GridActionsCellItem
            icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
            label="Aprobar"
            onClick={() => handleApproveEdit(params.row)}
            showInMenu={false}
          />,
          <GridActionsCellItem
            icon={<CancelIcon sx={{ color: 'error.main' }} />}
            label="Rechazar"
            onClick={() => handleRejectEdit(params.row)}
            showInMenu={false}
          />,
        ];
      },
    }] : []),
  ];

  // ============================================================
  // COLUMNAS - OG AUTH REQUESTS
  // ============================================================

  const ogAuthColumns: GridColDef<ExpenseOrderAuthRequest>[] = [
    {
      field: 'ogNumber',
      headerName: 'Nº OG',
      width: 150,
      valueGetter: (_, row) => row.expenseOrder?.ogNumber || '-',
      renderCell: (params) => (
        <Box
          sx={{ fontWeight: 600, color: 'primary.main', cursor: 'pointer' }}
          onClick={() => params.row.expenseOrder && handleViewExpenseOrder(params.row.expenseOrder.id)}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: 'ogStatus',
      headerName: 'Estado OG',
      width: 130,
      valueGetter: (_, row) => row.expenseOrder?.status || '-',
      renderCell: (params) => {
        const config = EXPENSE_ORDER_STATUS_CONFIG[params.value as keyof typeof EXPENSE_ORDER_STATUS_CONFIG];
        return config ? (
          <Chip label={config.label} color={config.color} size="small" />
        ) : (
          <Typography variant="body2">{params.value}</Typography>
        );
      },
    },
    {
      field: 'requestedStatus',
      headerName: 'Estado Solicitado',
      width: 150,
      renderCell: () => {
        const config = EXPENSE_ORDER_STATUS_CONFIG[ExpenseOrderStatus.AUTHORIZED];
        return <Chip label={config.label} color={config.color} size="small" variant="outlined" />;
      },
    },
    {
      field: 'requestedBy',
      headerName: 'Solicitado por',
      width: 200,
      valueGetter: (_, row) => getUserName(row.requestedBy),
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
      valueFormatter: (value) => formatDateTime(value),
    },
    ...(isAdmin ? [{
      field: 'actions',
      type: 'actions' as const,
      headerName: 'Acciones',
      width: 120,
      getActions: (params: any) => {
        if (params.row.status !== 'PENDING') {
          return [];
        }

        return [
          <GridActionsCellItem
            icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
            label="Aprobar"
            onClick={() => handleApproveOgAuth(params.row)}
            showInMenu={false}
          />,
          <GridActionsCellItem
            icon={<CancelIcon sx={{ color: 'error.main' }} />}
            label="Rechazar"
            onClick={() => handleRejectOgAuth(params.row)}
            showInMenu={false}
          />,
        ];
      },
    }] : []),
  ];

  // ============================================================
  // RENDER
  // ============================================================

  const statusCount = statusRequests?.length || 0;
  const editCount = editRequests?.length || 0;
  const ogAuthCount = ogAuthRequests?.length || 0;

  return (
    <Box>
      <PageHeader
        title="Solicitudes Pendientes"
        subtitle="Gestionar solicitudes pendientes de aprobación"
        icon={<PendingActionsIcon />}
      />

      <Paper sx={{ p: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<SwapHorizIcon />}
            iconPosition="start"
            label={
              <Badge badgeContent={statusCount} color="warning" sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>
                Cambio de Estado
              </Badge>
            }
          />
          <Tab
            icon={<EditNoteIcon />}
            iconPosition="start"
            label={
              <Badge badgeContent={editCount} color="warning" sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>
                Edición de Orden
              </Badge>
            }
          />
          <Tab
            icon={<ReceiptLongIcon />}
            iconPosition="start"
            label={
              <Badge badgeContent={ogAuthCount} color="warning" sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>
                Autorización OG
              </Badge>
            }
          />
        </Tabs>

        {/* Tab: Cambio de Estado */}
        {tabValue === 0 && (
          <DataTable
            rows={statusRequests || []}
            columns={statusColumns}
            loading={statusLoading}
            getRowId={(row) => row.id}
            pageSize={25}
          />
        )}

        {/* Tab: Edición de Orden */}
        {tabValue === 1 && (
          <DataTable
            rows={editRequests || []}
            columns={editColumns}
            loading={editLoading}
            getRowId={(row) => row.id}
            pageSize={25}
          />
        )}

        {/* Tab: Autorización OG */}
        {tabValue === 2 && (
          <DataTable
            rows={ogAuthRequests || []}
            columns={ogAuthColumns}
            loading={ogAuthLoading}
            getRowId={(row) => row.id}
            pageSize={25}
          />
        )}
      </Paper>

      {/* Dialog: Revisión de Cambio de Estado */}
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
                {ORDER_STATUS_CONFIG[reviewDialog.request.currentStatus as OrderStatus]?.label} →{' '}
                {ORDER_STATUS_CONFIG[reviewDialog.request.requestedStatus as OrderStatus]?.label}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Solicitado por:</strong> {getUserName(reviewDialog.request.requestedBy)}
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

      {/* Dialog: Revisión de Edición de Orden */}
      <Dialog open={editReviewDialog.open} onClose={handleCloseEditReviewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editReviewDialog.action === 'approve' ? 'Aprobar Solicitud de Edición' : 'Rechazar Solicitud de Edición'}
        </DialogTitle>
        <DialogContent>
          {editReviewDialog.request && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Orden:</strong> {editReviewDialog.request.order?.orderNumber || '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Solicitado por:</strong> {getUserName(editReviewDialog.request.requestedBy)}
              </Typography>
              {editReviewDialog.request.observations && (
                <Typography variant="body2">
                  <strong>Observaciones:</strong> {editReviewDialog.request.observations}
                </Typography>
              )}
              {editReviewDialog.action === 'approve' && (
                <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
                  Al aprobar, el usuario tendrá 5 minutos para realizar cambios en la orden.
                </Typography>
              )}
            </Box>
          )}

          <TextField
            fullWidth
            multiline
            rows={4}
            label={editReviewDialog.action === 'approve' ? 'Notas (opcional)' : 'Razón del rechazo *'}
            value={editReviewNotes}
            onChange={(e) => setEditReviewNotes(e.target.value)}
            placeholder={
              editReviewDialog.action === 'approve'
                ? 'Agregue notas adicionales...'
                : 'Explique por qué se rechaza la solicitud...'
            }
            required={editReviewDialog.action === 'reject'}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditReviewDialog}>Cancelar</Button>
          <Button
            onClick={handleConfirmEditReview}
            variant="contained"
            color={editReviewDialog.action === 'approve' ? 'success' : 'error'}
            disabled={
              approveEditMutation.isPending ||
              rejectEditMutation.isPending ||
              (editReviewDialog.action === 'reject' && !editReviewNotes.trim())
            }
          >
            {editReviewDialog.action === 'approve' ? 'Aprobar' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Revisión de Autorización de OG */}
      <Dialog open={ogAuthReviewDialog.open} onClose={handleCloseOgAuthReviewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {ogAuthReviewDialog.action === 'approve'
            ? 'Aprobar Solicitud de Autorización de OG'
            : 'Rechazar Solicitud de Autorización de OG'}
        </DialogTitle>
        <DialogContent>
          {ogAuthReviewDialog.request && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>OG:</strong> {ogAuthReviewDialog.request.expenseOrder?.ogNumber}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Estado solicitado:</strong> Autorizada
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Solicitado por:</strong> {getUserName(ogAuthReviewDialog.request.requestedBy)}
              </Typography>
              {ogAuthReviewDialog.request.reason && (
                <Typography variant="body2">
                  <strong>Razón:</strong> {ogAuthReviewDialog.request.reason}
                </Typography>
              )}
            </Box>
          )}

          <TextField
            fullWidth
            multiline
            rows={4}
            label={ogAuthReviewDialog.action === 'approve' ? 'Notas (opcional)' : 'Razón del rechazo *'}
            value={ogAuthReviewNotes}
            onChange={(e) => setOgAuthReviewNotes(e.target.value)}
            placeholder={
              ogAuthReviewDialog.action === 'approve'
                ? 'Agregue notas adicionales...'
                : 'Explique por qué se rechaza la solicitud...'
            }
            required={ogAuthReviewDialog.action === 'reject'}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOgAuthReviewDialog}>Cancelar</Button>
          <Button
            onClick={handleConfirmOgAuthReview}
            variant="contained"
            color={ogAuthReviewDialog.action === 'approve' ? 'success' : 'error'}
            disabled={
              approveOgAuthMutation.isPending ||
              rejectOgAuthMutation.isPending ||
              (ogAuthReviewDialog.action === 'reject' && !ogAuthReviewNotes.trim())
            }
          >
            {ogAuthReviewDialog.action === 'approve' ? 'Aprobar' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StatusChangeRequestsPage;
