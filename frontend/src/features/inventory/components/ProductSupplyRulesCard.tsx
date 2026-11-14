import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link as RouterLink } from 'react-router-dom';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '../../../utils/currencyInput';
import { useLotSupplies, useProductSupplyRules, useReplaceProductSupplyRules } from '../hooks/useSupplyLots';

interface ProductSupplyRulesCardProps {
  productId: string;
  productName?: string;
}

interface DraftRule {
  key: string;
  supplyId: string;
  factor: string;
}

let draftSeq = 0;
const newKey = () => `r-${++draftSeq}`;

/**
 * Receta del producto: qué insumos con rollos gasta cada unidad vendida. Con
 * ella el ítem de OP descuenta solo (p. ej. CINTA PREMIUM → 0,90 m de cinta +
 * papel). Cambiarla solo afecta los ítems que se creen desde ahora.
 */
export const ProductSupplyRulesCard: React.FC<ProductSupplyRulesCardProps> = ({ productId, productName }) => {
  const { hasPermission } = useAuthStore();
  const canRead = hasPermission(PERMISSIONS.READ_SUPPLY_LOTS);
  const canEdit = canRead && hasPermission(PERMISSIONS.UPDATE_PRODUCTS);

  const rulesQuery = useProductSupplyRules(productId, canRead);
  const suppliesQuery = useLotSupplies(canRead);
  const replaceMutation = useReplaceProductSupplyRules();
  const [drafts, setDrafts] = useState<DraftRule[]>([]);

  useEffect(() => {
    if (!rulesQuery.data) return;
    setDrafts(
      rulesQuery.data.map((r) => ({ key: newKey(), supplyId: r.supplyId, factor: String(r.factor) })),
    );
  }, [rulesQuery.data]);

  const supplies = suppliesQuery.data ?? [];
  const saved = useMemo(
    () => (rulesQuery.data ?? []).map((r) => `${r.supplyId}:${r.factor}`).sort().join('|'),
    [rulesQuery.data],
  );
  const current = drafts
    .map((d) => `${d.supplyId}:${parseCurrencyInput(d.factor, 4)}`)
    .sort()
    .join('|');
  const dirty = saved !== current;
  const chosen = drafts.map((d) => d.supplyId).filter(Boolean);
  const duplicated = new Set(chosen).size !== chosen.length;
  const invalid = drafts.some((d) => !d.supplyId || parseCurrencyInput(d.factor, 4) <= 0);

  const update = (key: string, patch: Partial<DraftRule>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const save = useSingleFlight(async () => {
    await replaceMutation.mutateAsync({
      productId,
      rules: drafts.map((d) => ({ supplyId: d.supplyId, factor: parseCurrencyInput(d.factor, 4) })),
    });
  });

  if (!canRead) return null;

  return (
    <Card sx={{ maxWidth: 600, mt: 3 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant='h6' gutterBottom>
          Insumos que consume
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Cuánto de cada insumo con rollos gasta una unidad vendida de {productName ?? 'este producto'}.
          Al crear o editar un ítem de OP se descuenta solo del rollo en uso. Los cambios aplican a los
          ítems que se creen desde ahora; lo ya descontado no se mueve.
        </Typography>

        {supplies.length === 0 && !suppliesQuery.isLoading && (
          <Alert severity='info' sx={{ mb: 2 }}>
            No hay insumos con rollos. Créalos en{' '}
            <Link component={RouterLink} to={ROUTES.SUPPLIES}>Insumos</Link> marcando «Controlar por rollos/lotes».
          </Alert>
        )}

        <Stack spacing={2}>
          {drafts.length === 0 && (
            <Typography variant='body2' color='text.secondary'>
              Sin receta: este producto no descuenta material automáticamente.
            </Typography>
          )}
          {drafts.map((d) => {
            const unit = supplies.find((s) => s.supplyId === d.supplyId)?.unit.abbreviation
              ?? rulesQuery.data?.find((r) => r.supplyId === d.supplyId)?.supply.consumptionUnit.abbreviation
              ?? '';
            const known = supplies.some((s) => s.supplyId === d.supplyId);
            const savedName = rulesQuery.data?.find((r) => r.supplyId === d.supplyId)?.supply.name;
            return (
              <Stack key={d.key} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
                <TextField
                  select
                  label='Insumo'
                  value={d.supplyId}
                  onChange={(e) => update(d.key, { supplyId: e.target.value })}
                  disabled={!canEdit}
                  size='small'
                  sx={{ flex: 2 }}
                  error={!!d.supplyId && chosen.filter((x) => x === d.supplyId).length > 1}
                >
                  {!known && d.supplyId && (
                    <MenuItem value={d.supplyId}>{savedName ?? 'Insumo inactivo'}</MenuItem>
                  )}
                  {supplies.map((s) => (
                    <MenuItem key={s.supplyId} value={s.supplyId}>
                      {s.supplyName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label='Por unidad vendida'
                  value={formatCurrencyInput(d.factor, 4)}
                  onChange={(e) => update(d.key, { factor: sanitizeCurrencyInput(e.target.value, 4) })}
                  disabled={!canEdit}
                  size='small'
                  inputMode='decimal'
                  sx={{ flex: 1 }}
                  InputProps={{ endAdornment: <InputAdornment position='end'>{unit}</InputAdornment> }}
                />
                {canEdit && (
                  <Tooltip title='Quitar de la receta'>
                    <IconButton
                      aria-label='Quitar insumo'
                      onClick={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            );
          })}
          {duplicated && <Alert severity='warning'>Un insumo aparece dos veces.</Alert>}
        </Stack>

        {canEdit && (
          <Stack direction='row' justifyContent='space-between' sx={{ mt: 2 }}>
            <Button
              size='small'
              startIcon={<AddIcon />}
              disabled={supplies.length === 0}
              onClick={() => setDrafts((prev) => [...prev, { key: newKey(), supplyId: '', factor: '1' }])}
            >
              Agregar insumo
            </Button>
            <LoadingButton
              variant='contained'
              size='small'
              loading={replaceMutation.isPending}
              disabled={!dirty || duplicated || invalid}
              onClick={() => save()}
            >
              Guardar receta
            </LoadingButton>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};
