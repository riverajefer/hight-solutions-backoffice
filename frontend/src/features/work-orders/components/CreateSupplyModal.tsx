import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useSupplies } from '../../portfolio/supplies/hooks/useSupplies';
import { useSupplyCategories } from '../../portfolio/supply-categories/hooks/useSupplyCategories';
import { useUnitsOfMeasure } from '../../portfolio/units-of-measure/hooks/useUnitsOfMeasure';
import type { Supply } from '../../../types/supply.types';

interface CreateSupplyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (supply: Supply) => void;
}

interface FormData {
  name: string;
  sku: string;
  categoryId: string;
  purchaseUnitId: string;
  consumptionUnitId: string;
  description: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  sku: '',
  categoryId: '',
  purchaseUnitId: '',
  consumptionUnitId: '',
  description: '',
};

export const CreateSupplyModal: React.FC<CreateSupplyModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { createSupplyMutation } = useSupplies();
  const { supplyCategoriesQuery } = useSupplyCategories();
  const { unitsOfMeasureQuery } = useUnitsOfMeasure();

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supplyCategories = supplyCategoriesQuery.data || [];
  const unitsOfMeasure = unitsOfMeasureQuery.data || [];

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.categoryId) newErrors.categoryId = 'La categoría es requerida';
    if (!formData.purchaseUnitId) newErrors.purchaseUnitId = 'La unidad de compra es requerida';
    if (!formData.consumptionUnitId) newErrors.consumptionUnitId = 'La unidad de consumo es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const supply = await createSupplyMutation.mutateAsync({
        name: formData.name.trim(),
        categoryId: formData.categoryId,
        purchaseUnitId: formData.purchaseUnitId,
        consumptionUnitId: formData.consumptionUnitId,
        ...(formData.sku.trim() && { sku: formData.sku.trim() }),
        ...(formData.description.trim() && { description: formData.description.trim() }),
      });
      setFormData(INITIAL_FORM);
      setErrors({});
      onSuccess(supply);
      enqueueSnackbar('Insumo creado correctamente', { variant: 'success' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar insumo';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const handleClose = () => {
    if (createSupplyMutation.isPending) return;
    setFormData(INITIAL_FORM);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Crear Nuevo Insumo</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              required
              label="Nombre"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              placeholder="Ej: PVC Espumado 10mm"
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="SKU"
              value={formData.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              placeholder="Ej: PVC-001"
              helperText="Opcional"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              required
              label="Categoría"
              value={formData.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              error={!!errors.categoryId}
              helperText={errors.categoryId}
            >
              <MenuItem value="">
                <em>Selecciona una categoría</em>
              </MenuItem>
              {supplyCategories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              required
              label="Unidad de Compra"
              value={formData.purchaseUnitId}
              onChange={(e) => handleChange('purchaseUnitId', e.target.value)}
              error={!!errors.purchaseUnitId}
              helperText={errors.purchaseUnitId}
            >
              <MenuItem value="">
                <em>Selecciona una unidad</em>
              </MenuItem>
              {unitsOfMeasure.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  {unit.name} ({unit.abbreviation})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              required
              label="Unidad de Consumo"
              value={formData.consumptionUnitId}
              onChange={(e) => handleChange('consumptionUnitId', e.target.value)}
              error={!!errors.consumptionUnitId}
              helperText={errors.consumptionUnitId}
            >
              <MenuItem value="">
                <em>Selecciona una unidad</em>
              </MenuItem>
              {unitsOfMeasure.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  {unit.name} ({unit.abbreviation})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={createSupplyMutation.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={createSupplyMutation.isPending}
        >
          {createSupplyMutation.isPending ? <CircularProgress size={24} /> : 'Crear Insumo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
