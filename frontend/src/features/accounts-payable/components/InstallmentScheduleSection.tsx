import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { AccountPayable, AccountPayableInstallment, InstallmentItemDto } from '../../../types/accounts-payable.types';
import { useAccountPayable } from '../hooks/useAccountsPayable';

interface Props {
  accountPayable: AccountPayable;
  canEdit: boolean;
}

const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CO').format(parseInt(digits, 10));
};

interface InstallmentRow {
  amount: string;
  dueDate: Date | null;
  notes: string;
}

const defaultRow = (): InstallmentRow => ({ amount: '', dueDate: null, notes: '' });

function InstallmentStatusChip({ installment }: { installment: AccountPayableInstallment }) {
  const now = new Date();
  const due = new Date(installment.dueDate);

  if (installment.isPaid) return <Chip label="Pagada" size="small" color="success" />;
  if (due < now) return <Chip label="Vencida" size="small" color="error" />;
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 7) return <Chip label="Próxima" size="small" color="warning" />;
  return <Chip label="Pendiente" size="small" color="default" />;
}

export const InstallmentScheduleSection: React.FC<Props> = ({ accountPayable, canEdit }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<InstallmentRow[]>([defaultRow()]);

  const { setInstallmentsMutation, toggleInstallmentPaidMutation, deleteInstallmentMutation } =
    useAccountPayable(accountPayable.id);

  const installments = accountPayable.installments ?? [];
  const total = Number(accountPayable.totalAmount);

  const openDialog = () => {
    if (installments.length > 0) {
      setRows(
        installments.map((i) => ({
          amount: String(Math.round(Number(i.amount))),
          dueDate: new Date(i.dueDate),
          notes: i.notes ?? '',
        })),
      );
    } else {
      setRows([defaultRow()]);
    }
    setOpen(true);
  };

  const addRow = () => setRows((prev) => [...prev, defaultRow()]);

  const updateRow = (index: number, field: keyof InstallmentRow, value: unknown) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const autoDistribute = () => {
    const n = rows.length;
    if (n === 0) return;
    const each = Math.floor(total / n);
    const remainder = Math.round(total - each * n);
    setRows((prev) =>
      prev.map((r, i) => ({
        ...r,
        amount: String(i === n - 1 ? each + remainder : each),
      })),
    );
  };

  const rowsTotal = rows.reduce((s, r) => s + (Number(r.amount.replace(/\D/g, '')) || 0), 0);
  const isValid =
    rows.length > 0 &&
    rows.every((r) => Number(r.amount.replace(/\D/g, '')) > 0 && r.dueDate !== null) &&
    Math.abs(rowsTotal - total) <= 1;

  const handleSave = async () => {
    const dto: InstallmentItemDto[] = rows.map((r) => ({
      amount: Number(r.amount.replace(/\D/g, '')),
      dueDate: r.dueDate!.toISOString(),
      notes: r.notes || undefined,
    }));
    await setInstallmentsMutation.mutateAsync({ installments: dto });
    setOpen(false);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" fontWeight={600}>
            Plan de Cuotas
          </Typography>
          {installments.length > 0 && (
            <Chip label={`${installments.length} cuota${installments.length > 1 ? 's' : ''}`} size="small" />
          )}
        </Stack>
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<EventNoteIcon />}
            onClick={openDialog}
          >
            {installments.length > 0 ? 'Editar plan' : 'Definir plan'}
          </Button>
        )}
      </Stack>

      {installments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Sin plan de cuotas.{' '}
          {canEdit && 'Puedes definir un calendario de pagos para esta obligación.'}
        </Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, pl: 0 }}>#</TableCell>
              <TableCell>Vencimiento</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>Estado</TableCell>
              {canEdit && <TableCell align="center">Pagada</TableCell>}
              {canEdit && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {installments.map((inst) => (
              <TableRow
                key={inst.id}
                sx={{ opacity: inst.isPaid ? 0.6 : 1 }}
              >
                <TableCell sx={{ pl: 0 }}>{inst.installmentNumber}</TableCell>
                <TableCell>{formatDate(inst.dueDate)}</TableCell>
                <TableCell align="right">{formatCurrency(inst.amount)}</TableCell>
                <TableCell>
                  <InstallmentStatusChip installment={inst} />
                </TableCell>
                {canEdit && (
                  <TableCell align="center">
                    <Checkbox
                      size="small"
                      checked={inst.isPaid}
                      disabled={toggleInstallmentPaidMutation.isPending}
                      onChange={(e) =>
                        toggleInstallmentPaidMutation.mutate({
                          installmentId: inst.id,
                          dto: { isPaid: e.target.checked },
                        })
                      }
                    />
                  </TableCell>
                )}
                {canEdit && (
                  <TableCell align="right" sx={{ pr: 0 }}>
                    <Tooltip title="Eliminar cuota">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={deleteInstallmentMutation.isPending}
                        onClick={() => deleteInstallmentMutation.mutate(inst.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Box>
      )}

      {/* ─── Dialog para definir / editar el plan ─────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Plan de Cuotas</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Total de la cuenta: <strong>{formatCurrency(total)}</strong>
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={autoDistribute}>
                  Distribuir en partes iguales
                </Button>
                <Button size="small" startIcon={<AddIcon />} onClick={addRow}>
                  Agregar cuota
                </Button>
              </Stack>
            </Stack>

            {rows.map((row, i) => (
              <Grid container spacing={1.5} key={i} alignItems="flex-start">
                <Grid item xs={12} sm={4}>
                  <TextField
                    label={`Cuota ${i + 1} — Monto *`}
                    size="small"
                    fullWidth
                    value={row.amount ? formatCurrencyInput(row.amount) : ''}
                    onChange={(e) => updateRow(i, 'amount', e.target.value.replace(/\D/g, ''))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    inputProps={{ style: { textAlign: 'right' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Fecha de vencimiento *"
                    value={row.dueDate}
                    onChange={(d) => updateRow(i, 'dueDate', d)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Notas"
                    size="small"
                    fullWidth
                    value={row.notes}
                    onChange={(e) => updateRow(i, 'notes', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center', pt: '6px !important' }}>
                  {rows.length > 1 && (
                    <IconButton size="small" color="error" onClick={() => removeRow(i)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Grid>
              </Grid>
            ))}

            {rows.length > 0 && (
              <Alert
                severity={Math.abs(rowsTotal - total) <= 1 ? 'success' : 'warning'}
                sx={{ py: 0.5 }}
              >
                Suma de cuotas: <strong>{formatCurrency(rowsTotal)}</strong>
                {Math.abs(rowsTotal - total) > 1 &&
                  ` — difiere del total (${formatCurrency(total)})`}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!isValid || setInstallmentsMutation.isPending}
            onClick={handleSave}
          >
            Guardar plan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
