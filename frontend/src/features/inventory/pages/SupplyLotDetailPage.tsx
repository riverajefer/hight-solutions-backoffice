import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Link,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { formatCurrency } from '../../../utils/formatters';
import { SupplyLotMovement } from '../../../types';
import { MovementTypeChip } from '../components/MovementTypeChip';
import { SupplyLotStatusChip } from '../components/SupplyLotStatusChip';
import { SupplyLotProgress } from '../components/SupplyLotProgress';
import {
  useCloseSupplyLot,
  useLotConsumption,
  useSetLotInUse,
  useSupplyLot,
  useVoidSupplyLot,
} from '../hooks/useSupplyLots';
import { formatLotDate, formatLotQuantity, formatLotUser } from '../utils/supplyLotFormat';

const Metric: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode }> = ({
  label,
  value,
  hint,
}) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6">{value}</Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Stack direction="row" spacing={2} sx={{ py: 0.5 }}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150 }}>
      {label}
    </Typography>
    <Typography variant="body2" component="div">
      {value}
    </Typography>
  </Stack>
);

/** Signo con que el movimiento afecta el saldo del rollo. */
const movementSign = (m: SupplyLotMovement): string => {
  if (m.type === 'ENTRY' || m.type === 'RETURN' || m.type === 'INITIAL') return '+';
  // Los ajustes de lote (anulación, cierre) siempre restan.
  return '−';
};

const SupplyLotDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const canManage = hasPermission(PERMISSIONS.MANAGE_SUPPLY_LOTS);

  const lotQuery = useSupplyLot(id);
  const consumptionQuery = useLotConsumption(id);
  const voidMutation = useVoidSupplyLot();
  const inUseMutation = useSetLotInUse();
  const closeMutation = useCloseSupplyLot();
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, setCloseReason] = useState('');

  const confirmClose = useSingleFlight(async () => {
    if (!id) return;
    await closeMutation.mutateAsync({ id, reason: closeReason.trim() });
    setCloseOpen(false);
    setCloseReason('');
  });

  const confirmVoid = useSingleFlight(async () => {
    if (!id) return;
    await voidMutation.mutateAsync({ id, reason: voidReason.trim() });
    setVoidOpen(false);
    setVoidReason('');
  });

  if (lotQuery.isLoading) return <LoadingSpinner />;
  if (lotQuery.isError || !lotQuery.data) {
    return <Alert severity="error">No se pudo cargar el rollo.</Alert>;
  }

  const lot = lotQuery.data;
  const unit = lot.supply.consumptionUnit.abbreviation;
  const isActive = lot.status === 'AVAILABLE' || lot.status === 'IN_USE';
  const canVoid = canManage && isActive && lot.consumedQuantity === 0 && lot.movements.length <= 1;
  const canMount = canManage && lot.status === 'AVAILABLE' && lot.remainingQuantity > 0;
  const consumptions = consumptionQuery.data ?? [];

  return (
    <Box>
      <PageHeader
        title={`Rollo ${lot.code}`}
        subtitle={lot.supply.name}
        icon={<ViewInArOutlinedIcon />}
        badge={
          <Stack direction="row" spacing={1}>
            <SupplyLotStatusChip status={lot.displayStatus} size="medium" />
            {lot.status === 'IN_USE' && <Chip label="En uso" color="info" />}
          </Stack>
        }
        breadcrumbs={[
          { label: 'Rollos y lotes', path: ROUTES.SUPPLY_LOTS },
          { label: lot.code },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(ROUTES.SUPPLY_LOTS)}>
              Volver
            </Button>
            {canMount && (
              <LoadingButton
                variant="outlined"
                startIcon={<PlayCircleOutlineIcon />}
                loading={inUseMutation.isPending}
                onClick={() => inUseMutation.mutate(lot.id)}
                tooltip="El consumo de las OP sale primero de este rollo"
              >
                Montar
              </LoadingButton>
            )}
            {canManage && isActive && (
              <Button variant="outlined" startIcon={<StopCircleOutlinedIcon />} onClick={() => setCloseOpen(true)}>
                Cerrar rollo
              </Button>
            )}
            {canVoid && (
              <Button color="error" variant="outlined" startIcon={<BlockIcon />} onClick={() => setVoidOpen(true)}>
                Anular
              </Button>
            )}
          </Stack>
        }
      />

      {lot.displayStatus === 'LOW' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Quedan {formatLotQuantity(lot.remainingQuantity, unit)}: menos del umbral de alerta (
          {formatLotQuantity(lot.lowStockQuantity, unit)}). Prepara el siguiente rollo.
        </Alert>
      )}
      {lot.status === 'VOIDED' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Rollo anulado el {formatLotDate(lot.depletedAt)}. Motivo: {lot.voidReason}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}>
          <Metric label="Largo inicial" value={formatLotQuantity(lot.initialQuantity, unit)} />
        </Grid>
        <Grid item xs={6} md={3}>
          <Metric
            label="Consumido en OP"
            value={formatLotQuantity(lot.consumedQuantity, unit)}
            hint={
              <>
                <SupplyLotProgress percent={lot.consumedPercent} status={lot.displayStatus} />
                {lot.wasteQuantity > 0 &&
                  `Merma: ${formatLotQuantity(lot.wasteQuantity, unit)} (${formatCurrency(lot.wasteValue)})`}
              </>
            }
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Metric
            label="Disponible"
            value={formatLotQuantity(lot.remainingQuantity, unit)}
            hint={`Valor: ${formatCurrency(lot.remainingValue)}`}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Metric
            label="Valor de adquisición"
            value={formatCurrency(lot.totalCost)}
            hint={`${formatCurrency(lot.unitCost, 2)} por ${unit}`}
          />
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Información del rollo
          </Typography>
          <InfoRow label="Tipo" value={lot.supply.name} />
          <InfoRow label="Fecha de ingreso" value={formatLotDate(lot.receivedAt)} />
          <InfoRow label="Registrado por" value={formatLotUser(lot.createdBy)} />
          {lot.depletedAt && lot.status !== 'VOIDED' && (
            <InfoRow label="Fecha de agotamiento" value={formatLotDate(lot.depletedAt)} />
          )}
          <InfoRow
            label="Alerta de inventario bajo"
            value={`por debajo de ${formatLotQuantity(lot.lowStockQuantity, unit)}`}
          />
          {lot.notes && <InfoRow label="Observaciones" value={lot.notes} />}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Órdenes que consumieron de este rollo
          </Typography>
          {consumptions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Ninguna OP tiene material cargado a este rollo.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>OP</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Ítem</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Costo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {consumptions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link component={RouterLink} to={ROUTES.ORDERS_DETAIL.replace(':id', c.order.id)} underline="hover" sx={{ whiteSpace: 'nowrap' }}>
                          {c.order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{c.order.client.name}</TableCell>
                      <TableCell>
                        {c.orderItem?.description ?? '—'}
                        {c.source === 'MANUAL' && (
                          <Chip size="small" variant="outlined" label="Corregido" sx={{ ml: 1 }} />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {formatLotQuantity(c.quantity, unit)}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(c.totalCost ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Movimientos del rollo
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Costo / {unit}</TableCell>
                  <TableCell>Detalle</TableCell>
                  <TableCell>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lot.movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(m.createdAt).toLocaleString('es-CO', {
                        timeZone: 'America/Bogota',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </TableCell>
                    <TableCell>
                      <MovementTypeChip type={m.type} />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {movementSign(m)}
                      {formatLotQuantity(m.quantity, unit)}
                    </TableCell>
                    <TableCell align="right">
                      {m.unitCost !== null ? formatCurrency(m.unitCost, 2) : '—'}
                    </TableCell>
                    <TableCell>{m.reason ?? m.notes ?? '—'}</TableCell>
                    <TableCell>{formatLotUser(m.performedBy)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={closeOpen} onClose={() => setCloseOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cerrar rollo {lot.code}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Ciérralo cuando el rollo ya no sirva (se acabó, el final no alcanza para imprimir). Lo que
            el sistema le ve —{formatLotQuantity(lot.remainingQuantity, unit)}, {formatCurrency(lot.remainingValue)}— sale
            del inventario como merma y no se carga a ninguna OP.
          </DialogContentText>
          <TextField
            label="Motivo"
            value={closeReason}
            onChange={(e) => setCloseReason(e.target.value)}
            required
            fullWidth
            multiline
            minRows={2}
            autoFocus
            helperText="Mínimo 5 caracteres (p. ej. fin del rollo, pruebas de color)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseOpen(false)}>Cancelar</Button>
          <LoadingButton
            variant="contained"
            loading={closeMutation.isPending}
            disabled={closeReason.trim().length < 5}
            onClick={confirmClose}
          >
            Cerrar rollo
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog open={voidOpen} onClose={() => setVoidOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Anular rollo {lot.code}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Úsalo solo si el rollo se registró por error. Sus{' '}
            {formatLotQuantity(lot.remainingQuantity, unit)} salen del inventario y el rollo queda en el
            histórico como anulado; no se borra.
          </DialogContentText>
          <TextField
            label="Motivo"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            required
            fullWidth
            multiline
            minRows={2}
            autoFocus
            helperText="Mínimo 5 caracteres"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidOpen(false)}>Cancelar</Button>
          <LoadingButton
            color="error"
            variant="contained"
            loading={voidMutation.isPending}
            disabled={voidReason.trim().length < 5}
            onClick={confirmVoid}
          >
            Anular rollo
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupplyLotDetailPage;
