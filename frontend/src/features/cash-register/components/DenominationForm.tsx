import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  COLOMBIAN_BILLS,
  COLOMBIAN_COINS,
  type DenominationCountItemDto,
  type ColombianDenomination,
} from '../../../types/cash-register.types';

interface DenominationRow {
  denomination: ColombianDenomination;
  quantity: number;
}

interface Props {
  value: DenominationRow[];
  onChange: (rows: DenominationRow[]) => void;
  readonly?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

const buildInitialRows = (): DenominationRow[] => [
  ...COLOMBIAN_BILLS.map((d) => ({ denomination: d, quantity: 0 })),
  ...COLOMBIAN_COINS.map((d) => ({ denomination: d, quantity: 0 })),
];

export const DenominationForm: React.FC<Props> = ({
  value,
  onChange,
  readonly = false,
}) => {
  const rows = value.length > 0 ? value : buildInitialRows();

  const total = useMemo(
    () => rows.reduce((acc, r) => acc + r.denomination * r.quantity, 0),
    [rows],
  );

  const handleQuantityChange = (denomination: ColombianDenomination, qty: number) => {
    const newQty = Math.max(0, qty);
    const updated = rows.map((r) =>
      r.denomination === denomination ? { ...r, quantity: newQty } : r,
    );
    onChange(updated);
  };

  const increment = (denomination: ColombianDenomination) => {
    const current = rows.find((r) => r.denomination === denomination)?.quantity ?? 0;
    handleQuantityChange(denomination, current + 1);
  };

  const decrement = (denomination: ColombianDenomination) => {
    const current = rows.find((r) => r.denomination === denomination)?.quantity ?? 0;
    handleQuantityChange(denomination, current - 1);
  };

  const renderRows = (denominations: readonly ColombianDenomination[]) =>
    denominations.map((denom) => {
      const row = rows.find((r) => r.denomination === denom) ?? {
        denomination: denom,
        quantity: 0,
      };
      const subtotal = row.denomination * row.quantity;

      return (
        <Grid container key={denom} alignItems="center" spacing={1} sx={{ mb: 1 }}>
          {/* Denomination label */}
          <Grid item xs={4}>
            <Typography variant="body2" fontWeight={500}>
              {formatCurrency(denom)}
            </Typography>
          </Grid>

          {/* Quantity controls */}
          <Grid item xs={5}>
            {readonly ? (
              <Typography variant="body2" align="center">
                {row.quantity}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => decrement(denom)}
                  disabled={row.quantity === 0}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <TextField
                  size="small"
                  value={row.quantity}
                  onChange={(e) =>
                    handleQuantityChange(denom, parseInt(e.target.value, 10) || 0)
                  }
                  inputProps={{
                    min: 0,
                    style: { textAlign: 'center', width: '50px' },
                  }}
                  type="number"
                />
                <IconButton size="small" onClick={() => increment(denom)}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Grid>

          {/* Subtotal */}
          <Grid item xs={3}>
            <Typography
              variant="body2"
              align="right"
              color={subtotal > 0 ? 'text.primary' : 'text.disabled'}
            >
              {formatCurrency(subtotal)}
            </Typography>
          </Grid>
        </Grid>
      );
    });

  return (
    <Box>
      {/* Column headers */}
      <Grid container spacing={1} sx={{ mb: 1, px: 0.5 }}>
        <Grid item xs={4}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Denominación
          </Typography>
        </Grid>
        <Grid item xs={5}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            align="center"
            display="block"
          >
            Cantidad
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            align="right"
            display="block"
          >
            Subtotal
          </Typography>
        </Grid>
      </Grid>

      {/* Bills section */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography
          variant="caption"
          fontWeight={700}
          color="primary"
          sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}
        >
          💵 Billetes
        </Typography>
        {renderRows(COLOMBIAN_BILLS)}
      </Paper>

      {/* Coins section */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography
          variant="caption"
          fontWeight={700}
          color="secondary"
          sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}
        >
          🪙 Monedas
        </Typography>
        {renderRows(COLOMBIAN_COINS)}
      </Paper>

      {/* Total */}
      <Divider sx={{ mb: 1.5 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Total
        </Typography>
        <Chip
          label={formatCurrency(total)}
          color={total > 0 ? 'success' : 'default'}
          variant={total > 0 ? 'filled' : 'outlined'}
          sx={{ fontSize: '1rem', fontWeight: 700, px: 1 }}
        />
      </Box>
    </Box>
  );
};

// Helper to convert form state to DTO
export const toDenominationDtoList = (
  rows: DenominationRow[],
): DenominationCountItemDto[] =>
  rows
    .filter((r) => r.quantity > 0)
    .map((r) => ({ denomination: r.denomination, quantity: r.quantity }));

// Helper to build initial state with all denominations at 0
export { buildInitialRows };

export default DenominationForm;
