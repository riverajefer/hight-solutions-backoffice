import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  Link,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { formatCurrency } from '../../../utils/formatters';
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '../../../utils/currencyInput';
import { OrderMaterialConsumption } from '../../../types';
import { useCorrectConsumption, useOrderMaterials, useSyncOrderMaterials } from '../hooks/useSupplyLots';
import { formatLotQuantity } from '../utils/supplyLotFormat';

interface OrderMaterialsSectionProps {
  orderId: string;
  items: { id: string; description: string }[];
}

/** Material por ítem y por insumo: suma de sus filas (pueden venir de varios rollos). */
interface ItemGroup {
  key: string;
  orderItemId: string | null;
  description: string;
  supplyId: string;
  supplyName: string;
  unit: string;
  quantity: number;
  totalCost: number;
  pending: number;
  manual: boolean;
  rows: OrderMaterialConsumption[];
}

/**
 * Material consumido por la OP (rollos DTF, etc.). Se calcula solo al crear o
 * editar la OP; aquí se ve de qué rollo salió, cuánto costó y se corrige a mano
 * cuando la cantidad vendida no son metros (stickers por unidad).
 */
export const OrderMaterialsSection: React.FC<OrderMaterialsSectionProps> = ({ orderId, items }) => {
  const { hasPermission } = useAuthStore();
  const canRead = hasPermission(PERMISSIONS.READ_SUPPLY_LOTS);
  const canCorrect = hasPermission(PERMISSIONS.MANAGE_MATERIAL_CONSUMPTION);

  const materialsQuery = useOrderMaterials(orderId, canRead);
  const syncMutation = useSyncOrderMaterials();
  const correctMutation = useCorrectConsumption();
  const [editing, setEditing] = useState<ItemGroup | null>(null);
  const [value, setValue] = useState('');

  const groups = useMemo<ItemGroup[]>(() => {
    const map = new Map<string, ItemGroup>();
    for (const row of materialsQuery.data ?? []) {
      const key = `${row.orderItemId}|${row.supply.id}`;
      const g =
        map.get(key) ??
        ({
          key,
          orderItemId: row.orderItemId,
          description: items.find((i) => i.id === row.orderItemId)?.description ?? 'Ítem eliminado',
          supplyId: row.supply.id,
          supplyName: row.supply.name,
          unit: row.supply.consumptionUnit.abbreviation,
          quantity: 0,
          totalCost: 0,
          pending: 0,
          manual: false,
          rows: [],
        } as ItemGroup);
      g.quantity += row.quantity;
      g.totalCost += row.totalCost ?? 0;
      if (!row.lot) g.pending += row.quantity;
      if (row.source === 'MANUAL') g.manual = true;
      g.rows.push(row);
      map.set(key, g);
    }
    return [...map.values()];
  }, [materialsQuery.data, items]);

  const save = useSingleFlight(async (quantity: number | null) => {
    if (!editing?.orderItemId) return;
    await correctMutation.mutateAsync({
      orderItemId: editing.orderItemId,
      supplyId: editing.supplyId,
      quantity,
    });
    setEditing(null);
  });

  if (!canRead || !materialsQuery.data || materialsQuery.data.length === 0) return null;

  const totalCost = groups.reduce((acc, g) => acc + g.totalCost, 0);
  const pendingCount = groups.filter((g) => g.pending > 0).length;

  return (
    <Accordion
      defaultExpanded={false}
      variant='outlined'
      sx={{ borderRadius: '12px !important', '&:before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
          <ViewInArOutlinedIcon color='action' />
          <Typography fontWeight={600}>Material consumido</Typography>
          <Chip size='small' label={formatCurrency(totalCost)} />
          {pendingCount > 0 && <Chip size='small' color='warning' label='Sin rollo asignado' />}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {pendingCount > 0 && (
          <Alert severity='warning' sx={{ mb: 2 }}>
            Parte del material se vendió sin saldo en los rollos registrados. Queda pendiente hasta
            que se registre el rollo y se asigne desde{' '}
            <Link component={RouterLink} to={ROUTES.SUPPLY_LOTS}>Rollos y lotes</Link>; mientras tanto no tiene costo.
          </Alert>
        )}
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Ítem</TableCell>
                <TableCell>Material</TableCell>
                <TableCell align='right'>Cantidad</TableCell>
                <TableCell>Rollo(s)</TableCell>
                <TableCell align='right'>Costo</TableCell>
                {canCorrect && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.key}>
                  <TableCell>{g.description}</TableCell>
                  <TableCell>
                    {g.supplyName}
                    {g.manual && <Chip size='small' variant='outlined' label='Corregido' sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell align='right' sx={{ whiteSpace: 'nowrap' }}>
                    {formatLotQuantity(g.quantity, g.unit)}
                  </TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={0.5} flexWrap='wrap' useFlexGap>
                      {g.rows.map((r) =>
                        r.lot ? (
                          <Chip
                            key={r.id}
                            size='small'
                            clickable
                            component={RouterLink}
                            to={ROUTES.SUPPLY_LOTS_DETAIL.replace(':id', r.lot.id)}
                            label={`${r.lot.code} · ${formatLotQuantity(r.quantity, g.unit)}`}
                          />
                        ) : (
                          <Chip key={r.id} size='small' color='warning' label={`Pendiente · ${formatLotQuantity(r.quantity, g.unit)}`} />
                        ),
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align='right'>{formatCurrency(g.totalCost)}</TableCell>
                  {canCorrect && (
                    <TableCell align='right'>
                      {g.orderItemId && (
                        <Button
                          size='small'
                          onClick={() => {
                            setValue(String(g.quantity));
                            setEditing(g);
                          }}
                        >
                          Corregir
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {canCorrect && (
          <Stack direction='row' justifyContent='flex-end' sx={{ mt: 1 }}>
            <LoadingButton size='small' loading={syncMutation.isPending} onClick={() => syncMutation.mutate(orderId)}>
              Recalcular
            </LoadingButton>
          </Stack>
        )}
      </AccordionDetails>

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth='xs' fullWidth>
        <DialogTitle>Corregir material usado</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editing?.description}: cuánto material ({editing?.supplyName}) se usó de verdad. Úsalo
            cuando la cantidad vendida no está en {editing?.unit} (p. ej. stickers por unidad). Una vez
            corregido, editar la OP ya no lo recalcula.
          </DialogContentText>
          <TextField
            label='Cantidad usada'
            value={formatCurrencyInput(value, 4)}
            onChange={(e) => setValue(sanitizeCurrencyInput(e.target.value, 4))}
            fullWidth
            autoFocus
            inputMode='decimal'
            InputProps={{ endAdornment: <InputAdornment position='end'>{editing?.unit}</InputAdornment> }}
          />
        </DialogContent>
        <DialogActions>
          {editing?.manual && (
            <Button onClick={() => save(null)} disabled={correctMutation.isPending} sx={{ mr: 'auto' }}>
              Volver a automático
            </Button>
          )}
          <Button onClick={() => setEditing(null)}>Cancelar</Button>
          <LoadingButton
            variant='contained'
            loading={correctMutation.isPending}
            disabled={parseCurrencyInput(value, 4) <= 0}
            onClick={() => save(parseCurrencyInput(value, 4))}
          >
            Guardar
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Accordion>
  );
};
