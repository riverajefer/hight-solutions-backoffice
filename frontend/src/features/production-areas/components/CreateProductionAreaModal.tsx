import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  CircularProgress,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useProductionAreas } from '../hooks/useProductionAreas';
import type { ProductionArea } from '../../../types/production-area.types';

interface CreateProductionAreaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (productionArea: ProductionArea) => void;
}

interface FormData {
  name: string;
  description: string;
}

export const CreateProductionAreaModal: React.FC<CreateProductionAreaModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { createProductionAreaMutation } = useProductionAreas();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const productionArea = await createProductionAreaMutation.mutateAsync({
        name: formData.name.trim(),
        ...(formData.description.trim() && { description: formData.description.trim() }),
      });

      setFormData({ name: '', description: '' });
      setErrors({});
      onSuccess(productionArea);
      enqueueSnackbar('Área de producción creada correctamente', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Error al guardar área de producción', { variant: 'error' });
    }
  };

  const handleClose = () => {
    if (!createProductionAreaMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Crear Nueva Área de Producción</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nombre"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              autoFocus
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Descripción"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descripción opcional"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={createProductionAreaMutation.isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={createProductionAreaMutation.isPending}
        >
          {createProductionAreaMutation.isPending ? (
            <CircularProgress size={24} />
          ) : (
            'Crear Área'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
