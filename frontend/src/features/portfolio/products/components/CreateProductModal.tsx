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
  InputAdornment,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useProducts } from '../hooks/useProducts';
import { useProductCategories } from '../../product-categories/hooks/useProductCategories';
import type { Product } from '../../../../types/product.types';

interface CreateProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
}

interface FormData {
  name: string;
  categoryId: string;
  description: string;
  basePrice: string;
  priceUnit: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  categoryId: '',
  description: '',
  basePrice: '',
  priceUnit: '',
};

const formatCurrencyInput = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  const number = parseInt(numericValue, 10);
  return new Intl.NumberFormat('es-CO').format(number);
};

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { createProductMutation } = useProducts();
  const { productCategoriesQuery } = useProductCategories();

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const productCategories = productCategoriesQuery.data || [];

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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const product = await createProductMutation.mutateAsync({
        name: formData.name.trim(),
        categoryId: formData.categoryId,
        ...(formData.description.trim() && { description: formData.description.trim() }),
        ...(formData.basePrice && { basePrice: Number(formData.basePrice) }),
        ...(formData.priceUnit.trim() && { priceUnit: formData.priceUnit.trim() }),
      });
      setFormData(INITIAL_FORM);
      setErrors({});
      onSuccess(product);
      enqueueSnackbar('Producto creado correctamente', { variant: 'success' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar producto';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const handleClose = () => {
    if (createProductMutation.isPending) return;
    setFormData(INITIAL_FORM);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Crear Nuevo Producto</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Nombre"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              placeholder="Ej: Banner 1×2 metros"
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
              {productCategories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={12}>
            <TextField
              fullWidth
              label="Precio Base"
              value={formData.basePrice ? formatCurrencyInput(formData.basePrice) : ''}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\D/g, '');
                handleChange('basePrice', rawValue);
              }}
              placeholder="Ej: 85.000"
              helperText="Opcional"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ style: { textAlign: 'right' } }}
            />
          </Grid>


        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={createProductMutation.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={createProductMutation.isPending}
        >
          {createProductMutation.isPending ? <CircularProgress size={24} /> : 'Crear Producto'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
