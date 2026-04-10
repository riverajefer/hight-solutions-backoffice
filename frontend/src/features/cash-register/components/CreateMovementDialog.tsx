import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  InputAdornment,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CashMovementType } from '../../../types/cash-register.types';
import axiosInstance from '../../../api/axios';
import type { Order } from '../../../types/order.types';

const schema = z.object({
  amount: z
    .number({ invalid_type_error: 'Ingresa un monto válido' })
    .positive('El monto debe ser mayor a 0'),
  description: z.string().min(1, 'La descripción es requerida').max(500),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
  WITHDRAWAL: 'Retiro de Efectivo',
  DEPOSIT: 'Depósito a Caja',
};

const MOVEMENT_TYPE_COLORS: Record<CashMovementType, 'success' | 'error' | 'warning' | 'info'> = {
  INCOME: 'success',
  EXPENSE: 'error',
  WITHDRAWAL: 'warning',
  DEPOSIT: 'info',
};

interface Props {
  open: boolean;
  movementType: CashMovementType;
  cashSessionId: string;
  onClose: () => void;
  onSubmit: (data: {
    cashSessionId: string;
    movementType: CashMovementType;
    amount: number;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

interface OrderOption {
  id: string;
  orderNumber: string;
  clientName: string;
  balance: string;
  total: string;
}

const CreateMovementDialog: React.FC<Props> = ({
  open,
  movementType,
  cashSessionId,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [linkToOrder, setLinkToOrder] = useState(false);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderOption | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: undefined as any, description: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ amount: undefined as any, description: '' });
      setLinkToOrder(false);
      setSelectedOrder(null);
    }
  }, [open, reset]);

  useEffect(() => {
    if (linkToOrder && movementType === 'INCOME') {
      axiosInstance
        .get('/orders', { params: { limit: 50, status: 'CONFIRMED,IN_PRODUCTION,READY,DELIVERED,DELIVERED_ON_CREDIT' } })
        .then((r) => {
          const list = (r.data?.data || []).map((o: Order) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            clientName: (o as any).client?.name || '',
            balance: o.balance,
            total: o.total,
          }));
          setOrders(list);
        })
        .catch(() => {});
    }
  }, [linkToOrder, movementType]);

  const handleOrderSelect = (order: OrderOption | null) => {
    setSelectedOrder(order);
    if (order) {
      const balance = parseFloat(order.balance);
      if (!isNaN(balance)) {
        setValue('amount', balance);
      }
    }
  };

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit({
      cashSessionId,
      movementType,
      amount: data.amount,
      description: data.description,
      referenceType: linkToOrder && selectedOrder ? 'ORDER' : undefined,
      referenceId: linkToOrder && selectedOrder ? selectedOrder.id : undefined,
    });
  };

  const color = MOVEMENT_TYPE_COLORS[movementType];
  const label = MOVEMENT_TYPE_LABELS[movementType];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogTitle>
          Registrar{' '}
          <Typography component="span" color={`${color}.main`} fontWeight={700}>
            {label}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Amount */}
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || '')}
                  label="Monto"
                  type="number"
                  fullWidth
                  required
                  error={!!errors.amount}
                  helperText={errors.amount?.message}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: '0.01' }}
                />
              )}
            />

            {/* Description */}
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descripción"
                  fullWidth
                  required
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  placeholder={
                    movementType === 'INCOME'
                      ? 'Ej: Pago factura #123'
                      : movementType === 'EXPENSE'
                      ? 'Ej: Compra de papelería'
                      : movementType === 'WITHDRAWAL'
                      ? 'Ej: Consignación bancaria'
                      : 'Descripción del depósito'
                  }
                />
              )}
            />

            {/* Link to order (only for INCOME) */}
            {movementType === 'INCOME' && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Tipo de ingreso</InputLabel>
                  <Select
                    value={linkToOrder ? 'order' : 'other'}
                    onChange={(e) => setLinkToOrder(e.target.value === 'order')}
                    label="Tipo de ingreso"
                  >
                    <MenuItem value="other">Otro ingreso</MenuItem>
                    <MenuItem value="order">Cobro a Orden de Pedido (OP)</MenuItem>
                  </Select>
                </FormControl>

                {linkToOrder && (
                  <Autocomplete
                    options={orders}
                    value={selectedOrder}
                    onChange={(_, newValue) => handleOrderSelect(newValue)}
                    getOptionLabel={(o) =>
                      `${o.orderNumber} — ${o.clientName} (Saldo: $${parseFloat(o.balance).toLocaleString('es-CO')})`
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Buscar Orden de Pedido"
                        placeholder="Número de orden o cliente..."
                      />
                    )}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                  />
                )}
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color={color}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
          >
            Registrar {label}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateMovementDialog;
