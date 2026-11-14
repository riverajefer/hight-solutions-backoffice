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
  IconButton,
  InputAdornment,
  Link,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { formatCurrency } from '../../../utils/formatters';
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '../../../utils/currencyInput';
import { OrderMaterialConsumption } from '../../../types';
import {
  useCorrectConsumption,
  useLotSupplies,
  useOrderMaterials,
  useSwapConsumptionSupply,
  useSyncOrderMaterials,
} from '../hooks/useSupplyLots';
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
  /** Hay una corrección manual que manda sobre la receta. */
  manual: boolean;
  /** Corrección a 0: el ítem no gastó este insumo (lo puso el cliente u otro insumo). */
  zeroed: boolean;
  note: string | null;
  rows: OrderMaterialConsumption[];
}

type DialogMode = 'correct' | 'client' | 'swap' | 'add';

const CLIENT_NOTE_DEFAULT = 'El cliente trajo el material';

/**
 * Material consumido por la OP (rollos DTF, papel, tela, cinta, vinilo…). Se
 * calcula solo con la receta del producto al crear o editar la OP; aquí se ve
 * de qué rollo salió y cuánto costó, y se corrige cuando lo vendido no dice lo
 * que se gastó: cantidad real, «lo pone el cliente», otro insumo o material de
 * un ítem sin receta.
 */
export const OrderMaterialsSection: React.FC<OrderMaterialsSectionProps> = ({ orderId, items }) => {
  const { hasPermission } = useAuthStore();
  const canRead = hasPermission(PERMISSIONS.READ_SUPPLY_LOTS);
  const canCorrect = hasPermission(PERMISSIONS.MANAGE_MATERIAL_CONSUMPTION);

  const materialsQuery = useOrderMaterials(orderId, canRead);
  const suppliesQuery = useLotSupplies(canRead && canCorrect);
  const syncMutation = useSyncOrderMaterials();
  const correctMutation = useCorrectConsumption();
  const swapMutation = useSwapConsumptionSupply();

  const [menu, setMenu] = useState<{ anchor: HTMLElement; group: ItemGroup } | null>(null);
  const [dialog, setDialog] = useState<{ mode: DialogMode; group: ItemGroup | null } | null>(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [itemId, setItemId] = useState('');
  const [supplyId, setSupplyId] = useState('');

  const groups = useMemo<ItemGroup[]>(() => {
    const map = new Map<string, ItemGroup>();
    const describe = (id: string | null) => items.find((i) => i.id === id)?.description ?? 'Ítem eliminado';
    const blank = (orderItemId: string | null, supply: OrderMaterialConsumption['supply']): ItemGroup => ({
      key: `${orderItemId}|${supply.id}`,
      orderItemId,
      description: describe(orderItemId),
      supplyId: supply.id,
      supplyName: supply.name,
      unit: supply.consumptionUnit.abbreviation,
      quantity: 0,
      totalCost: 0,
      pending: 0,
      manual: false,
      zeroed: false,
      note: null,
      rows: [],
    });

    for (const row of materialsQuery.data?.rows ?? []) {
      const key = `${row.orderItemId}|${row.supply.id}`;
      const g = map.get(key) ?? blank(row.orderItemId, row.supply);
      g.quantity += row.quantity;
      g.totalCost += row.totalCost ?? 0;
      if (!row.lot) g.pending += row.quantity;
      if (row.source === 'MANUAL') g.manual = true;
      g.rows.push(row);
      map.set(key, g);
    }
    for (const o of materialsQuery.data?.overrides ?? []) {
      const key = `${o.orderItemId}|${o.supply.id}`;
      const g = map.get(key) ?? blank(o.orderItemId, o.supply);
      g.manual = true;
      g.zeroed = o.quantity === 0;
      g.note = o.note;
      map.set(key, g);
    }
    return [...map.values()];
  }, [materialsQuery.data, items]);

  const openDialog = (mode: DialogMode, group: ItemGroup | null) => {
    setMenu(null);
    setQuantity(group && mode !== 'client' ? String(group.quantity || '') : '');
    setNote(mode === 'client' ? CLIENT_NOTE_DEFAULT : '');
    setItemId(group?.orderItemId ?? items[0]?.id ?? '');
    setSupplyId('');
    setDialog({ mode, group });
  };
  const close = () => setDialog(null);

  const submit = useSingleFlight(async () => {
    if (!dialog) return;
    const { mode, group } = dialog;
    const qty = parseCurrencyInput(quantity, 4);
    const cleanNote = note.trim() || undefined;
    if (mode === 'swap' && group?.orderItemId) {
      await swapMutation.mutateAsync({
        orderItemId: group.orderItemId,
        fromSupplyId: group.supplyId,
        toSupplyId: supplyId,
        quantity: qty > 0 ? qty : undefined,
        note: cleanNote,
      });
    } else if (mode === 'client' && group?.orderItemId) {
      await correctMutation.mutateAsync({
        orderItemId: group.orderItemId,
        supplyId: group.supplyId,
        quantity: 0,
        note: cleanNote,
      });
    } else if (mode === 'correct' && group?.orderItemId) {
      await correctMutation.mutateAsync({
        orderItemId: group.orderItemId,
        supplyId: group.supplyId,
        quantity: qty,
        note: cleanNote,
      });
    } else if (mode === 'add') {
      await correctMutation.mutateAsync({ orderItemId: itemId, supplyId, quantity: qty, note: cleanNote });
    }
    close();
  });

  const backToAuto = useSingleFlight(async (group: ItemGroup) => {
    setMenu(null);
    if (!group.orderItemId) return;
    await correctMutation.mutateAsync({ orderItemId: group.orderItemId, supplyId: group.supplyId, quantity: null });
  });

  const hasData = groups.length > 0;
  if (!canRead || !materialsQuery.data || (!hasData && !(canCorrect && items.length > 0))) return null;

  const totalCost = groups.reduce((acc, g) => acc + g.totalCost, 0);
  const pendingCount = groups.filter((g) => g.pending > 0).length;
  const lotSupplies = suppliesQuery.data ?? [];
  const mode = dialog?.mode;
  const group = dialog?.group ?? null;
  const swapTargets = lotSupplies.filter(
    (s) => s.supplyId !== group?.supplyId && (!group || s.unit.abbreviation === group.unit),
  );
  const addSupply = lotSupplies.find((s) => s.supplyId === supplyId);
  const unit = mode === 'add' ? addSupply?.unit.abbreviation ?? '' : group?.unit ?? '';
  const qty = parseCurrencyInput(quantity, 4);
  const saving = correctMutation.isPending || swapMutation.isPending;
  const canSubmit =
    mode === 'client'
      ? note.trim().length > 0
      : mode === 'swap'
        ? !!supplyId
        : mode === 'add'
          ? !!itemId && !!supplyId && qty > 0
          : qty > 0;

  const titles: Record<DialogMode, string> = {
    correct: 'Corregir material usado',
    client: 'El material lo puso el cliente',
    swap: 'Se hizo en otro insumo',
    add: 'Agregar material a un ítem',
  };

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
        {!hasData ? (
          <Typography variant='body2' color='text.secondary'>
            Ningún ítem de esta OP tiene receta de material. Si alguno gastó un insumo con rollos
            (p. ej. una bandera a la medida), regístralo con «Agregar material».
          </Typography>
        ) : (
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
                      {g.zeroed ? (
                        <Tooltip title={g.note ?? ''}>
                          <Chip size='small' variant='outlined' color='info' label='No gastó' sx={{ ml: 1 }} />
                        </Tooltip>
                      ) : (
                        g.manual && (
                          <Tooltip title={g.note ?? ''}>
                            <Chip size='small' variant='outlined' label='Corregido' sx={{ ml: 1 }} />
                          </Tooltip>
                        )
                      )}
                      {g.note && (
                        <Typography variant='caption' color='text.secondary' display='block'>
                          {g.note}
                        </Typography>
                      )}
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
                          <IconButton
                            size='small'
                            aria-label={`Acciones de ${g.supplyName}`}
                            onClick={(e) => setMenu({ anchor: e.currentTarget, group: g })}
                          >
                            <MoreVertIcon fontSize='small' />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {canCorrect && (
          <Stack direction='row' justifyContent='flex-end' spacing={1} sx={{ mt: 1 }}>
            <Button size='small' startIcon={<AddIcon />} onClick={() => openDialog('add', null)}>
              Agregar material
            </Button>
            <LoadingButton size='small' loading={syncMutation.isPending} onClick={() => syncMutation.mutate(orderId)}>
              Recalcular
            </LoadingButton>
          </Stack>
        )}
      </AccordionDetails>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => menu && openDialog('correct', menu.group)}>
          <ListItemText primary='Corregir cantidad' secondary='Lo vendido no está en la unidad del rollo' />
        </MenuItem>
        <MenuItem onClick={() => menu && openDialog('client', menu.group)}>
          <ListItemText primary='Lo puso el cliente' secondary='No se gastó de nuestros rollos' />
        </MenuItem>
        <MenuItem onClick={() => menu && openDialog('swap', menu.group)}>
          <ListItemText primary='Se hizo en otro insumo' secondary='P. ej. otra tela u otro papel' />
        </MenuItem>
        {menu?.group.manual && (
          <MenuItem onClick={() => menu && backToAuto(menu.group)} disabled={correctMutation.isPending}>
            <ListItemText primary='Volver a automático' secondary='Calcular con la receta del producto' />
          </MenuItem>
        )}
      </Menu>

      <Dialog open={!!dialog} onClose={close} maxWidth='xs' fullWidth>
        <DialogTitle>{mode ? titles[mode] : ''}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {mode === 'correct' &&
              `${group?.description}: cuánto ${group?.supplyName} se usó de verdad. Úsalo cuando la cantidad vendida no está en ${group?.unit} (p. ej. stickers por unidad).`}
            {mode === 'client' &&
              `${group?.description}: no se descuenta ${group?.supplyName} de los rollos y lo que ya salió vuelve al rollo.`}
            {mode === 'swap' &&
              `${group?.description}: ${group?.supplyName} vuelve al rollo y el consumo pasa al insumo que elijas.`}
            {mode === 'add' && 'Para un ítem sin receta que gastó un insumo con rollos (p. ej. una bandera a la medida).'}
            {' '}Editar la OP ya no lo recalcula.
          </DialogContentText>
          <Stack spacing={2}>
            {mode === 'add' && (
              <TextField select label='Ítem' value={itemId} onChange={(e) => setItemId(e.target.value)} fullWidth>
                {items.map((i) => (
                  <MenuItem key={i.id} value={i.id}>{i.description}</MenuItem>
                ))}
              </TextField>
            )}
            {(mode === 'swap' || mode === 'add') && (
              <TextField
                select
                label={mode === 'swap' ? 'Insumo que se usó' : 'Insumo'}
                value={supplyId}
                onChange={(e) => setSupplyId(e.target.value)}
                fullWidth
                helperText={
                  (mode === 'swap' ? swapTargets : lotSupplies).length === 0
                    ? `No hay otros insumos con rollos${mode === 'swap' ? ` en ${group?.unit}` : ''}. Créalos en Insumos.`
                    : undefined
                }
              >
                {(mode === 'swap' ? swapTargets : lotSupplies).map((s) => (
                  <MenuItem key={s.supplyId} value={s.supplyId}>
                    {s.supplyName} · quedan {formatLotQuantity(s.remainingQuantity, s.unit.abbreviation)}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {mode !== 'client' && (
              <TextField
                label={mode === 'swap' ? 'Cantidad usada (opcional)' : 'Cantidad usada'}
                value={formatCurrencyInput(quantity, 4)}
                onChange={(e) => setQuantity(sanitizeCurrencyInput(e.target.value, 4))}
                fullWidth
                autoFocus={mode === 'correct'}
                inputMode='decimal'
                helperText={mode === 'swap' ? `Vacío = la misma cantidad (${formatLotQuantity(group?.quantity ?? 0, unit)})` : undefined}
                InputProps={{ endAdornment: <InputAdornment position='end'>{unit}</InputAdornment> }}
              />
            )}
            <TextField
              label={mode === 'client' ? 'Motivo' : 'Observación (opcional)'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              required={mode === 'client'}
              autoFocus={mode === 'client'}
              inputProps={{ maxLength: 300 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancelar</Button>
          <LoadingButton variant='contained' loading={saving} disabled={!canSubmit} onClick={() => submit()}>
            Guardar
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Accordion>
  );
};
