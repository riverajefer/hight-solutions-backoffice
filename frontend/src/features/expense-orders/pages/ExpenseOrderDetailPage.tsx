import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Chip,
  Grid,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import { useExpenseOrder } from '../hooks';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import {
  ExpenseOrderStatus,
  EXPENSE_ORDER_STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
} from '../../../types/expense-order.types';

const formatDate = (date?: string | null): string => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const formatCurrency = (value?: string | number | null): string => {
  if (value == null) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(isNaN(num) ? 0 : num);
};

const STATUS_TRANSITIONS: Record<ExpenseOrderStatus, ExpenseOrderStatus[]> = {
  [ExpenseOrderStatus.DRAFT]: [ExpenseOrderStatus.CREATED, ExpenseOrderStatus.AUTHORIZED],
  [ExpenseOrderStatus.CREATED]: [ExpenseOrderStatus.AUTHORIZED, ExpenseOrderStatus.DRAFT],
  [ExpenseOrderStatus.AUTHORIZED]: [ExpenseOrderStatus.PAID],
  [ExpenseOrderStatus.PAID]: [],
};

const userName = (user?: { firstName?: string | null; lastName?: string | null; email: string } | null) => {
  if (!user) return '—';
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.email;
};

export const ExpenseOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const { expenseOrderQuery, updateStatusMutation } = useExpenseOrder(id);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ExpenseOrderStatus | ''>('');

  const canUpdate = hasPermission(PERMISSIONS.UPDATE_EXPENSE_ORDERS);
  const canApprove = hasPermission(PERMISSIONS.APPROVE_EXPENSE_ORDERS);

  const og = expenseOrderQuery.data;

  const handleStatusChange = async () => {
    if (!id || !newStatus) return;
    await updateStatusMutation.mutateAsync({ id, dto: { status: newStatus as ExpenseOrderStatus } });
    setStatusDialogOpen(false);
    setNewStatus('');
  };

  if (expenseOrderQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (!og) {
    return (
      <Box>
        <PageHeader title="Orden de Gasto" />
        <Alert severity="error">Orden de gasto no encontrada.</Alert>
      </Box>
    );
  }

  const statusConfig = EXPENSE_ORDER_STATUS_CONFIG[og.status];
  const allowedTransitions = STATUS_TRANSITIONS[og.status] ?? [];
  const totalAmount = og.items.reduce((acc, item) => acc + parseFloat(item.total), 0);
  const isEditable =
    og.status === ExpenseOrderStatus.DRAFT || og.status === ExpenseOrderStatus.CREATED;

  const availableTransitions = allowedTransitions.filter((s) => {
    if (s === ExpenseOrderStatus.PAID) return canApprove;
    return canUpdate;
  });

  return (
    <Box>
      <PageHeader
        title={og.ogNumber}
        subtitle={`${og.expenseType.name} / ${og.expenseSubcategory.name}`}
      />

      {/* Header actions */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(ROUTES.EXPENSE_ORDERS)}>
          Volver
        </Button>
        {canUpdate && isEditable && (
          <Button
            startIcon={<EditIcon />}
            variant="outlined"
            onClick={() => navigate(ROUTES.EXPENSE_ORDERS_EDIT.replace(':id', og.id))}
          >
            Editar
          </Button>
        )}
        {availableTransitions.length > 0 && (
          <Button
            startIcon={<SwapHorizIcon />}
            variant="contained"
            onClick={() => setStatusDialogOpen(true)}
          >
            Cambiar Estado
          </Button>
        )}
      </Stack>

      <Grid container spacing={3}>
        {/* Left column */}
        <Grid item xs={12} md={8}>
          {/* General info */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Información General
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Estado</Typography>
                  <Box mt={0.5}>
                    <Chip label={statusConfig.label} color={statusConfig.color} size="small" />
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Fecha</Typography>
                  <Typography variant="body2">{formatDate(og.createdAt)}</Typography>
                </Grid>
                {og.workOrder && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">OT Asociada</Typography>
                    <Typography variant="body2">{og.workOrder.workOrderNumber}</Typography>
                  </Grid>
                )}
                {og.areaOrMachine && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Área / Máquina</Typography>
                    <Typography variant="body2">{og.areaOrMachine}</Typography>
                  </Grid>
                )}
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Se autoriza a</Typography>
                  <Typography variant="body2">{userName(og.authorizedTo)}</Typography>
                </Grid>
                {og.responsible && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Responsable</Typography>
                    <Typography variant="body2">{userName(og.responsible)}</Typography>
                  </Grid>
                )}
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Creado por</Typography>
                  <Typography variant="body2">{userName(og.createdBy)}</Typography>
                </Grid>
              </Grid>

              {og.observations && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary">Observaciones</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
                    {og.observations}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>

          {/* Items table */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Ítems de Gasto
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ítem</TableCell>
                    <TableCell align="center">Cant.</TableCell>
                    <TableCell align="right">Precio Unit.</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Método de Pago</TableCell>
                    <TableCell>Proveedor</TableCell>
                    {og.workOrder && <TableCell>Áreas</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {og.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {item.name}
                        </Typography>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary">
                            {item.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell align="right">
                        <strong>{formatCurrency(item.total)}</strong>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={PAYMENT_METHOD_LABELS[item.paymentMethod]}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{item.supplier?.name ?? '—'}</TableCell>
                      {og.workOrder && (
                        <TableCell>
                          {item.productionAreas.length > 0
                            ? item.productionAreas
                                .map((pa) => pa.productionArea.name)
                                .join(', ')
                            : '—'}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={og.workOrder ? 3 : 3} />
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight={700}>
                        {formatCurrency(totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={og.workOrder ? 3 : 2} />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Right column: OT details */}
        {og.workOrder && (
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                  Orden de Trabajo Asociada
                </Typography>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Número</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {og.workOrder.workOrderNumber}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Cliente</Typography>
                    <Typography variant="body2">{og.workOrder.order.client.name}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Orden</Typography>
                    <Typography variant="body2">{og.workOrder.order.orderNumber}</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Status change dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar Estado de la OG</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Estado actual:{' '}
            <strong>{EXPENSE_ORDER_STATUS_CONFIG[og.status].label}</strong>
          </Typography>
          <TextField
            select
            fullWidth
            label="Nuevo estado"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ExpenseOrderStatus)}
          >
            {availableTransitions.map((s) => (
              <MenuItem key={s} value={s}>
                {EXPENSE_ORDER_STATUS_CONFIG[s].label}
                {s === ExpenseOrderStatus.PAID && ' (requiere permiso de aprobación)'}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleStatusChange}
            disabled={!newStatus || updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseOrderDetailPage;
