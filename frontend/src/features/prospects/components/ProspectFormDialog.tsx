import React, { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Prospect } from '../../../types/prospect.types';

/**
 * Ningún campo es obligatorio por sí solo: la vendedora captura al prospecto
 * con lo que tenga en el momento (a veces solo el celular). La única regla es
 * que haya al menos un dato de contacto, y se valida a nivel de objeto para
 * mostrar un mensaje único en vez de tres errores de campo.
 */
const schema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z
      .string()
      .optional()
      .refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'Correo inválido'),
    observation: z.string().optional(),
  })
  .refine(
    (data) =>
      [data.name, data.phone, data.email].some((v) => (v ?? '').trim().length > 0),
    {
      message: 'Registra al menos un dato: nombre, celular o correo',
      path: ['name'],
    },
  );

type FormValues = z.infer<typeof schema>;

interface ProspectFormDialogProps {
  open: boolean;
  prospect?: Prospect | null;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export const ProspectFormDialog: React.FC<ProspectFormDialogProps> = ({
  open,
  prospect,
  isSaving = false,
  onClose,
  onSubmit,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', observation: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: prospect?.name ?? '',
      phone: prospect?.phone ?? '',
      email: prospect?.email ?? '',
      observation: prospect?.observation ?? '',
    });
  }, [open, prospect, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {prospect ? 'Editar prospecto' : 'Nuevo prospecto'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Basta con un dato: nombre, celular o correo. Puedes completar el
            resto más adelante.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nombre"
                    fullWidth
                    autoFocus
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Celular" fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Correo"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="observation"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Observación"
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Ej: se envió catálogo, el cliente no contestó..."
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
