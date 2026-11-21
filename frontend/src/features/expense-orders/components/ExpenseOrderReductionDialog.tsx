import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { useCreateExpenseOrderReduction } from '../../../hooks/useExpenseOrderReductions';
import { expenseOrderReductionRequestsApi } from '../../../api/expense-order-reduction-requests.api';
import { formatCurrency } from '../../../utils/formatters';
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '../../../utils/currencyInput';
import { formatDateTime, formatSigned } from '../../cash-register/utils/cashTransfer';
import type { ExpenseOrder } from '../../../types/expense-order.types';
import type {
  ExpenseOrderReductionPlan,
  ReductionMoneyLocation,
} from '../../../types/expense-order-reduction.types';

const MIN_REASON = 10;

/** Qué pasa al aprobar. Se usa al pedir y en la bandeja del admin. */
export const ReductionPlanSummary: React.FC<{ plan: ExpenseOrderReductionPlan }> = ({ plan }) => {
  const openChange = Number(plan.openSessionsCashChange);
  return (
    <Stack spacing={1.5}>
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Stack spacing={0.5}>
          <Row label="Valor actual" value={formatCurrency(plan.previousTotal)} />
          <Row label="Valor nuevo" value={formatCurrency(plan.newTotal)} strong />
          <Row label="Pagado al proveedor" value={formatCurrency(plan.paid)} />
          <Row label="Diferencia a recuperar" value={formatCurrency(plan.difference)} strong />
        </Stack>
      </Box>

      {plan.moneyLocation === 'SUPPLIER_RETURNS' ? (
        <Alert severity="info">
          Al aprobarse, la OG y su cuenta por pagar quedan en el valor nuevo y el proveedor queda debiendo{' '}
          <strong>{formatCurrency(plan.difference)}</strong>. Cuando los devuelva, Caja registra el reintegro desde la OG.
        </Alert>
      ) : (
        <>
          <Typography variant="body2">
            Al aprobarse, baja{plan.adjustments.length === 1 ? ' el egreso' : 'n los egresos'}:{' '}
            {plan.adjustments.map((a, i) => (
              <span key={a.movementId}>
                {i > 0 && ', '}
                <strong>{a.receiptNumber}</strong> de {formatCurrency(a.amountBefore)} a {formatCurrency(a.amountAfter)}
              </span>
            ))}
            .
          </Typography>
          {plan.closings.map((c) => (
            <Box
              key={c.sessionId}
              sx={{ p: 2, borderRadius: 1, border: 1, borderColor: c.worsens ? 'warning.main' : 'divider' }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Cierre del {formatDateTime(c.closedAt)} · {c.cashRegisterName}
              </Typography>
              <Row
                label="Esperado"
                value={`${formatCurrency(c.systemBalanceBefore)} → ${formatCurrency(c.systemBalanceAfter)}`}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">Diferencia</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    {formatSigned(c.discrepancyBefore)} → <strong>{formatSigned(c.discrepancyAfter)}</strong>
                  </Typography>
                  {c.worsens && <Chip label="Empeora" color="warning" size="small" />}
                </Box>
              </Box>
              {c.worsens && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  Ese día no sobró ese dinero. Si sí se le entregó al proveedor, elige «El proveedor devuelve la
                  diferencia».
                </Alert>
              )}
              {c.crossesMonth && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  Cambia el arqueo de <strong>{c.monthLabel}</strong>. Avísale a contabilidad.
                </Alert>
              )}
            </Box>
          ))}
          {openChange !== 0 && (
            <Typography variant="body2" color="text.secondary">
              La caja abierta esperará <strong>{formatCurrency(Math.abs(openChange))} más</strong> en efectivo.
            </Typography>
          )}
        </>
      )}
    </Stack>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={strong ? 700 : 400} sx={{ textAlign: 'right' }}>{value}</Typography>
  </Box>
);

interface ItemDraft {
  itemId: string;
  name: string;
  previousQuantity: number;
  previousUnitPrice: number;
  previousTotal: number;
  quantity: string;
  unitPrice: string;
}

interface Props {
  open: boolean;
  og: ExpenseOrder;
  onClose: () => void;
}

/** Pedir bajar el valor de una OG pagada. Lo aprueba un administrador distinto. */
const ExpenseOrderReductionDialog: React.FC<Props> = ({ open, og, onClose }) => {
  const createMutation = useCreateExpenseOrderReduction();
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [moneyLocation, setMoneyLocation] = useState<ReductionMoneyLocation | ''>('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems(
      og.items.map((item) => ({
        itemId: item.id,
        name: item.name,
        previousQuantity: Number(item.quantity),
        previousUnitPrice: Number(item.unitPrice),
        previousTotal: Number(item.total),
        quantity: String(Number(item.quantity)),
        unitPrice: String(Number(item.unitPrice)),
      })),
    );
    setMoneyLocation('');
    setReason('');
    setTouched(false);
  }, [open, og]);

  const payload = useMemo(
    () => ({
      items: items.map((i) => ({
        itemId: i.itemId,
        quantity: Number(i.quantity.replace(',', '.')),
        unitPrice: parseCurrencyInput(i.unitPrice),
      })),
      moneyLocation: (moneyLocation || 'SUPPLIER_RETURNS') as ReductionMoneyLocation,
    }),
    [items, moneyLocation],
  );

  // Vista previa con una pausa corta para no consultar en cada tecla.
  const [debounced, setDebounced] = useState(payload);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(payload), 400);
    return () => clearTimeout(t);
  }, [payload]);

  const validNumbers = debounced.items.every((i) => i.quantity > 0 && i.unitPrice >= 0);
  const previewQuery = useQuery({
    queryKey: ['expense-order-reduction-preview', og.id, debounced],
    queryFn: () => expenseOrderReductionRequestsApi.preview(og.id, debounced),
    enabled: open && items.length > 0 && validNumbers && !!moneyLocation,
    retry: false,
  });
  const plan = previewQuery.data;
  const previewError = (previewQuery.error as { response?: { data?: { message?: string } } } | null)?.response?.data
    ?.message;

  const reasonError = touched && reason.trim().length < MIN_REASON;
  const canSubmit =
    !!plan && !plan.ineligibleReason && !plan.pendingRequestId && reason.trim().length >= MIN_REASON && !previewQuery.isFetching;

  const submit = useSingleFlight(async () => {
    setTouched(true);
    if (!canSubmit || !moneyLocation) return;
    await createMutation.mutateAsync({
      expenseOrderId: og.id,
      dto: { ...payload, moneyLocation, reason: reason.trim() },
    });
    onClose();
  });

  const update = (index: number, patch: Partial<ItemDraft>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Bajar el valor de la {og.ogNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Para una OG pagada con un valor mayor al real. Escribe la cantidad o el precio correctos; ningún ítem
            puede subir. Un administrador distinto de ti debe aprobarlo.
          </Typography>

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ítem</TableCell>
                  <TableCell align="right">Actual</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>Cantidad</TableCell>
                  <TableCell align="right" sx={{ width: 170 }}>Precio unitario</TableCell>
                  <TableCell align="right">Nuevo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const newTotal = Number(item.quantity.replace(',', '.')) * parseCurrencyInput(item.unitPrice);
                  const rises = newTotal > item.previousTotal + 0.005;
                  return (
                    <TableRow key={item.itemId}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {item.previousQuantity} × {formatCurrency(item.previousUnitPrice)}
                        <br />
                        <Typography variant="caption" color="text.secondary">{formatCurrency(item.previousTotal)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          value={item.quantity}
                          onChange={(e) => update(index, { quantity: e.target.value.replace(/[^\d.,]/g, '') })}
                          inputProps={{ style: { textAlign: 'right' }, inputMode: 'decimal' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          value={formatCurrencyInput(item.unitPrice)}
                          onChange={(e) => update(index, { unitPrice: sanitizeCurrencyInput(e.target.value) })}
                          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                          inputProps={{ style: { textAlign: 'right' }, inputMode: 'decimal' }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: rises ? 'error.main' : undefined }}>
                        {Number.isFinite(newTotal) ? formatCurrency(newTotal) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          <FormControl>
            <FormLabel sx={{ fontWeight: 600, color: 'text.primary' }}>¿Dónde está la diferencia?</FormLabel>
            <RadioGroup value={moneyLocation} onChange={(e) => setMoneyLocation(e.target.value as ReductionMoneyLocation)}>
              <FormControlLabel
                value="SUPPLIER_RETURNS"
                control={<Radio />}
                label="Se le pagó al proveedor y él la devuelve: Caja registra el reintegro cuando la reciba"
              />
              <FormControlLabel
                value="NEVER_LEFT"
                control={<Radio />}
                label="Nunca salió de la caja: Caja entregó solo el valor real"
              />
            </RadioGroup>
          </FormControl>

          {moneyLocation && previewQuery.isFetching && !plan && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {previewError && <Alert severity="error">{previewError}</Alert>}
          {plan?.ineligibleReason && <Alert severity="error">{plan.ineligibleReason}</Alert>}
          {plan && !plan.ineligibleReason && plan.pendingRequestId && (
            <Alert severity="info">Ya hay una solicitud pendiente para bajar el valor de esta OG.</Alert>
          )}
          {plan && !plan.ineligibleReason && !plan.pendingRequestId && (
            <>
              <ReductionPlanSummary plan={plan} />
              {plan.applyIssue && <Alert severity="info">{plan.applyIssue}</Alert>}
            </>
          )}

          <TextField
            label="Motivo"
            placeholder="Ej.: el proveedor cobró 160 unidades, no 202"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            multiline
            minRows={2}
            fullWidth
            required
            error={reasonError}
            helperText={reasonError ? `Explica el motivo (mínimo ${MIN_REASON} caracteres)` : undefined}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <LoadingButton variant="contained" loading={createMutation.isPending} disabled={!canSubmit} onClick={() => submit()}>
          Solicitar
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default ExpenseOrderReductionDialog;
