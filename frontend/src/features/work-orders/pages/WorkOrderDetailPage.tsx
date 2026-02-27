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
  Paper,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  SwapHoriz as SwapHorizIcon,
  AccountTree as AccountTreeIcon,
} from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import { ToolbarButton } from '../../orders/components/ToolbarButton';
import { useWorkOrder } from '../hooks';
import { WorkOrderStatusChip } from '../components';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { WorkOrderStatus, WORK_ORDER_STATUS_CONFIG } from '../../../types/work-order.types';

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

const formatCurrency = (value?: string | null): string => {
  if (!value) return '-';
  const num = parseFloat(value);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(isNaN(num) ? 0 : num);
};

const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  [WorkOrderStatus.DRAFT]: [WorkOrderStatus.CONFIRMED, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.CONFIRMED]: [WorkOrderStatus.IN_PRODUCTION, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.IN_PRODUCTION]: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.COMPLETED]: [],
  [WorkOrderStatus.CANCELLED]: [],
};

export const WorkOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { hasPermission } = useAuthStore();

  const { workOrderQuery, updateStatusMutation } = useWorkOrder(id);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<WorkOrderStatus | ''>('');

  const canUpdate = hasPermission(PERMISSIONS.UPDATE_WORK_ORDERS);

  const workOrder = workOrderQuery.data;

  const handleStatusChange = async () => {
    if (!id || !newStatus) return;
    await updateStatusMutation.mutateAsync({ id, dto: { status: newStatus as WorkOrderStatus } });
    setStatusDialogOpen(false);
    setNewStatus('');
  };

  if (workOrderQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!workOrder) {
    return (
      <Alert severity="error">Orden de trabajo no encontrada</Alert>
    );
  }

  const currentStatus = workOrder.status as WorkOrderStatus;
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] ?? [];
  const advisorName = `${workOrder.advisor.firstName ?? ''} ${workOrder.advisor.lastName ?? ''}`.trim() || workOrder.advisor.email;
  const designerName = workOrder.designer
    ? `${workOrder.designer.firstName ?? ''} ${workOrder.designer.lastName ?? ''}`.trim() || workOrder.designer.email
    : '-';

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={workOrder.workOrderNumber}
        subtitle="Detalle de la Orden de Trabajo"
        breadcrumbs={[
          { label: 'Órdenes de Trabajo', path: ROUTES.WORK_ORDERS },
          { label: workOrder.workOrderNumber },
        ]}
      />

      {/* Toolbar de Acciones */}
      <Paper
        elevation={0}
        sx={{
          mt: 2,
          mb: 3,
          p: 0,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.04)'
              : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          border: (theme) =>
            `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        <Stack
          direction="row"
          spacing={0}
          alignItems="stretch"
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ my: 1.5, opacity: 0.5 }}
            />
          }
        >
          {canUpdate && ['DRAFT', 'CONFIRMED'].includes(currentStatus) && (
            <ToolbarButton
              icon={<EditIcon />}
              label="Editar"
              onClick={() => navigate(ROUTES.WORK_ORDERS_EDIT.replace(':id', id!))}
              tooltip="Editar Orden de Trabajo"
            />
          )}

          {canUpdate && allowedTransitions.length > 0 && (
            <ToolbarButton
              icon={<SwapHorizIcon />}
              label="Estado"
              secondaryLabel="Cambiar"
              onClick={() => setStatusDialogOpen(true)}
              color={theme.palette.info.main}
              tooltip="Cambiar Estado"
            />
          )}

          <ToolbarButton
            icon={<AccountTreeIcon />}
            label="Trazabilidad"
            onClick={() => navigate(`/orders/flow/work-order/${id}`)}
            tooltip="Ver Trazabilidad"
          />
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Info general */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Información General
              </Typography>
              <Stack spacing={1.5} divider={<Divider />}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Estado</Typography>
                  <Box mt={0.5}>
                    <WorkOrderStatusChip status={workOrder.status} size="medium" />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Asesor</Typography>
                  <Typography variant="body1">{advisorName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Diseñador</Typography>
                  <Typography variant="body1">{designerName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Nombre de archivo</Typography>
                  <Typography variant="body1">{workOrder.fileName || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Creada</Typography>
                  <Typography variant="body1">{formatDate(workOrder.createdAt)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Última actualización</Typography>
                  <Typography variant="body1">{formatDate(workOrder.updatedAt)}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Orden de pedido vinculada */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Orden de Pedido Vinculada
              </Typography>
              <Stack spacing={1.5} divider={<Divider />}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Número de orden</Typography>
                  <Typography
                    variant="body1"
                    component="span"
                    sx={{ cursor: 'pointer', color: 'primary.main', display: 'block' }}
                    onClick={() => navigate(ROUTES.ORDERS_DETAIL.replace(':id', workOrder.order.id))}
                  >
                    {workOrder.order.orderNumber}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Cliente</Typography>
                  <Typography variant="body1">{workOrder.order.client.name}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total de la orden</Typography>
                  <Typography variant="body1">{formatCurrency(workOrder.order.total)}</Typography>
                </Box>
                {workOrder.order.deliveryDate && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Fecha de entrega</Typography>
                    <Typography variant="body1">{formatDate(workOrder.order.deliveryDate)}</Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Items / Productos */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Productos ({workOrder.items.length})
              </Typography>
              <Stack spacing={2} divider={<Divider />}>
                {workOrder.items.map((item, index) => (
                  <Box key={item.id}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Producto {index + 1}: {item.productDescription}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Item original: {item.orderItem.description} · Cant: {item.orderItem.quantity} · Precio: {formatCurrency(item.orderItem.unitPrice)}
                    </Typography>

                    {item.productionAreas.length > 0 && (
                      <Box mt={1}>
                        <Typography variant="caption" color="text.secondary">Áreas de producción</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                          {item.productionAreas.map((pa) => (
                            <Chip key={pa.productionArea.id} label={pa.productionArea.name} size="small" />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {item.supplies.length > 0 && (
                      <Box mt={1}>
                        <Typography variant="caption" color="text.secondary">Insumos</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                          {item.supplies.map((s) => (
                            <Chip
                              key={s.supply.id}
                              label={s.supply.sku ? `${s.supply.name} (${s.supply.sku})` : s.supply.name}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {item.observations && (
                      <Typography variant="body2" mt={1} color="text.secondary">
                        Obs: {item.observations}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Observaciones */}
        {workOrder.observations && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Observaciones Generales</Typography>
                <Typography variant="body1">{workOrder.observations}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}        
      </Grid>

      {/* Dialog: Cambiar Estado */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar Estado de la OT</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Estado actual: <WorkOrderStatusChip status={currentStatus} />
          </Typography>
          <TextField
            select
            label="Nuevo estado"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as WorkOrderStatus)}
            fullWidth
            sx={{ mt: 2 }}
          >
            {allowedTransitions.map((s) => (
              <MenuItem key={s} value={s}>
                {WORK_ORDER_STATUS_CONFIG[s]?.label ?? s}
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

export default WorkOrderDetailPage;
