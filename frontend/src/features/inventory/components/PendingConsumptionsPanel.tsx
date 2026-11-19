import React, { useMemo } from 'react';
import {
  Alert,
  Card,
  Link,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { PendingMaterialConsumption } from '../../../types';
import { useAssignPending } from '../hooks/useSupplyLots';
import { formatLotDate, formatLotQuantity, lotTerms } from '../utils/supplyLotFormat';

/**
 * Bandeja de consumos vendidos sin saldo en los rollos registrados. La venta no
 * se frena (decisión del cliente); el material queda aquí hasta que se registre
 * el rollo y se asigne.
 */
export const PendingConsumptionsPanel: React.FC<{ rows: PendingMaterialConsumption[] }> = ({ rows }) => {
  const { hasPermission } = useAuthStore();
  const canAssign = hasPermission(PERMISSIONS.MANAGE_SUPPLY_LOTS);
  const assignMutation = useAssignPending();

  const bySupply = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; total: number; rows: PendingMaterialConsumption[] }>();
    for (const r of rows) {
      const g = map.get(r.supply.id) ?? {
        name: r.supply.name,
        unit: r.supply.consumptionUnit.abbreviation,
        total: 0,
        rows: [],
      };
      g.total += r.quantity;
      g.rows.push(r);
      map.set(r.supply.id, g);
    }
    return [...map.entries()];
  }, [rows]);

  if (rows.length === 0) {
    return <Alert severity="success">No hay consumos sin asignar: todo el material vendido salió de un rollo o lote registrado.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Estas ventas se hicieron sin saldo en los rollos o lotes registrados. Registra el rollo o lote
        que se usó y luego «Asignar»: se toman en orden de llegada, del que está en uso primero.
      </Alert>
      {bySupply.map(([supplyId, g]) => (
        <Card key={supplyId} variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {g.name} · {formatLotQuantity(g.total, g.unit)} sin {lotTerms(g.unit).noun}
              </Typography>
              {canAssign && (
                <LoadingButton
                  variant="contained"
                  size="small"
                  loading={assignMutation.isPending && assignMutation.variables === supplyId}
                  disabled={assignMutation.isPending}
                  onClick={() => assignMutation.mutate(supplyId)}
                >
                  Asignar a {lotTerms(g.unit).plural}
                </LoadingButton>
              )}
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>OP</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Ítem</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>Desde</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {g.rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link component={RouterLink} to={ROUTES.ORDERS_DETAIL.replace(':id', r.order.id)} underline="hover" sx={{ whiteSpace: 'nowrap' }}>
                          {r.order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{r.order.client.name}</TableCell>
                      <TableCell>{r.orderItem?.description ?? '—'}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {formatLotQuantity(r.quantity, g.unit)}
                      </TableCell>
                      <TableCell>{formatLotDate(r.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};
