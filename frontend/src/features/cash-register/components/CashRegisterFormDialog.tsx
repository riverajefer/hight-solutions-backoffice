import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  CircularProgress,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CashRegister } from '../../../types/cash-register.types';

const schema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  register?: CashRegister | null;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

const CashRegisterFormDialog: React.FC<Props> = ({
  open,
  register,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const isEditing = !!register;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: register?.name ?? '',
        description: register?.description ?? '',
        isActive: register?.isActive ?? true,
      });
    }
  }, [open, register, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {isEditing ? 'Editar Caja Registradora' : 'Nueva Caja Registradora'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nombre"
                  fullWidth
                  required
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  placeholder="Ej: Caja Principal"
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descripción"
                  fullWidth
                  multiline
                  rows={2}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  placeholder="Descripción opcional de la caja"
                />
              )}
            />

            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      color="primary"
                    />
                  }
                  label="Caja activa"
                />
              )}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
          >
            {isEditing ? 'Guardar Cambios' : 'Crear Caja'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CashRegisterFormDialog;
