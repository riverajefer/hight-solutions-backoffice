import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { EditNote as EditNoteIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEditRequests } from '../../../hooks/useEditRequests';
import { useAuthStore } from '../../../store/authStore';

const schema = z.object({
  observations: z
    .string()
    .min(10, 'Debes proporcionar al menos 10 caracteres de observación')
    .max(500, 'Máximo 500 caracteres'),
});

type FormData = z.infer<typeof schema>;

interface RequestEditPermissionButtonProps {
  orderId: string;
  orderStatus: string;
}

export const RequestEditPermissionButton: React.FC<
  RequestEditPermissionButtonProps
> = ({ orderId, orderStatus }) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();
  const { createMutation, activePermissionQuery } = useEditRequests(orderId);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      observations: '',
    },
  });

  // No mostrar el botón si:
  // - Es admin
  // - La orden está en DRAFT
  // - Ya tiene un permiso activo
  const isAdmin = user?.role?.name === 'admin';
  const isDraft = orderStatus === 'DRAFT';
  const hasActivePermission = !!activePermissionQuery.data;

  if (isAdmin || isDraft || hasActivePermission) {
    return null;
  }

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const onSubmit = async (data: FormData) => {
    await createMutation.mutateAsync(data);
    handleClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        startIcon={<EditNoteIcon />}
        onClick={handleOpen}
      >
        Solicitar Permiso de Edición
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Solicitar Permiso de Edición</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="observations"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Observaciones"
                  placeholder="Explica por qué necesitas editar esta orden..."
                  multiline
                  rows={4}
                  fullWidth
                  required
                  error={!!errors.observations}
                  helperText={errors.observations?.message}
                  sx={{ mt: 1 }}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Enviando...' : 'Enviar Solicitud'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};
