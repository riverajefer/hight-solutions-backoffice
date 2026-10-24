import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { getDeliveryDateError } from '../utils/deliveryDate';

interface DeliveryDateTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  /** Solo muestra el error cuando el usuario ya intentó continuar o tocó el campo. */
  showError?: boolean;
  disabled?: boolean;
}

export const DeliveryDateTimePicker: React.FC<DeliveryDateTimePickerProps> = ({
  value,
  onChange,
  showError = false,
  disabled = false,
}) => {
  const error = showError ? getDeliveryDateError(value) : null;

  return (
    <DateTimePicker
      label="Fecha y Hora de Entrega *"
      value={value}
      onChange={onChange}
      disabled={disabled}
      minDateTime={new Date()}
      slotProps={{
        textField: {
          fullWidth: true,
          size: 'small',
          error: !!error,
          helperText: error ?? 'Fecha y hora estimada de entrega de la OP',
        },
      }}
    />
  );
};

interface DeliveryDateDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: (deliveryDate: Date) => void | Promise<void>;
  onCancel: () => void;
  confirmText?: string;
  isLoading?: boolean;
  /** Contenido adicional bajo el selector (avisos, alertas). */
  children?: React.ReactNode;
}

/**
 * Confirmación para crear una OP desde otro documento: pide la fecha y hora de
 * entrega, que la cotización y el registro DTF no traen.
 */
export const DeliveryDateDialog: React.FC<DeliveryDateDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Convertir',
  isLoading = false,
  children,
}) => {
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (open) {
      setDeliveryDate(null);
      setShowError(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (getDeliveryDateError(deliveryDate)) {
      setShowError(true);
      return;
    }
    void onConfirm(deliveryDate!);
  };

  return (
    <Dialog
      open={open}
      // Mientras la conversión corre no se cierra: la OP ya va en camino.
      onClose={isLoading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2.5, mt: 0.5 }}>{message}</Box>
        <DeliveryDateTimePicker
          value={deliveryDate}
          onChange={(date) => {
            setDeliveryDate(date);
            setShowError(true);
          }}
          showError={showError}
          disabled={isLoading}
        />
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <LoadingButton
          variant="contained"
          color="success"
          onClick={handleConfirm}
          loading={isLoading}
        >
          {confirmText}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
