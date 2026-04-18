import React, { useState, useEffect } from 'react';
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
  Autocomplete,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useSuppliers } from '../hooks/useSuppliers';
import { useDepartments, useCitiesByDepartment } from '../../locations/hooks/useLocations';
import type { Supplier, PersonType } from '../../../types/supplier.types';

interface CreateSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (supplier: Supplier) => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  landlinePhone?: string;
  address?: string;
  personType: PersonType;
  departmentId: string;
  cityId: string;
  nit?: string;
  encargado?: string;
}

export const CreateSupplierModal: React.FC<CreateSupplierModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { createSupplierMutation } = useSuppliers();
  const departmentsQuery = useDepartments();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    landlinePhone: '',
    address: '',
    personType: 'NATURAL',
    departmentId: '',
    cityId: '',
    nit: '',
    encargado: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const departments = departmentsQuery.data || [];
  const citiesQuery = useCitiesByDepartment(formData.departmentId);
  const cities = citiesQuery.data || [];

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'departmentId' && { cityId: '' }),
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  useEffect(() => {
    if (departments.length > 0 && !formData.departmentId) {
      const cundinamarca = departments.find(d => 
        d.name.toLowerCase().includes('cundinamarca')
      );
      if (cundinamarca) {
        setFormData(prev => ({ ...prev, departmentId: cundinamarca.id }));
      }
    }
  }, [departments, formData.departmentId]);

  useEffect(() => {
    if (cities.length > 0 && !formData.cityId && formData.departmentId) {
      const cundinamarcaId = departments.find(d => 
        d.name.toLowerCase().includes('cundinamarca')
      )?.id;

      if (formData.departmentId === cundinamarcaId) {
        const bogota = cities.find(c => 
          c.name.toLowerCase().includes('bogotá') || c.name.toLowerCase().includes('bogota')
        );
        if (bogota) {
          setFormData(prev => ({ ...prev, cityId: bogota.id }));
        }
      }
    }
  }, [cities, formData.cityId, formData.departmentId, departments]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.email.trim()) newErrors.email = 'El email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';

    if (!formData.departmentId) newErrors.departmentId = 'El departamento es requerido';
    if (!formData.cityId) newErrors.cityId = 'La ciudad es requerida';

    if (formData.personType === 'EMPRESA' && formData.nit) {
      if (formData.nit.length > 12) newErrors.nit = 'El NIT no puede exceder 12 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const supplier = await createSupplierMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        personType: formData.personType,
        departmentId: formData.departmentId,
        cityId: formData.cityId,
        ...(formData.landlinePhone && { landlinePhone: formData.landlinePhone }),
        ...(formData.address && { address: formData.address }),
        ...(formData.nit && { nit: formData.nit }),
        ...(formData.encargado && { encargado: formData.encargado }),
      });

      setFormData({
        name: '', email: '', phone: '', landlinePhone: '', address: '',
        personType: 'NATURAL', departmentId: '', cityId: '', nit: '', encargado: '',
      });
      setErrors({});
      onSuccess(supplier);
      enqueueSnackbar('Proveedor creado correctamente', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Error al guardar proveedor', { variant: 'error' });
    }
  };

  const handleClose = () => {
    if (!createSupplierMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Crear Nuevo Proveedor</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField select fullWidth label="Tipo de Persona" value={formData.personType} onChange={(e) => handleChange('personType', e.target.value as PersonType)}>
              <MenuItem value="NATURAL">Persona Natural</MenuItem>
              <MenuItem value="EMPRESA">Empresa</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField required fullWidth label={formData.personType === 'EMPRESA' ? 'Razón Social' : 'Nombre Completo'} value={formData.name} onChange={(e) => handleChange('name', e.target.value)} error={!!errors.name} helperText={errors.name} />
          </Grid>
          {formData.personType === 'NATURAL' && (
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Cédula" value={formData.nit} onChange={(e) => { const value = e.target.value.replace(/[^0-9-]/g, '').slice(0,12); handleChange('nit', value); }} inputProps={{ maxLength: 12 }} placeholder="1234567890" error={!!errors.nit} helperText={errors.nit} />
            </Grid>
          )}
          {formData.personType === 'EMPRESA' && (
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="NIT" value={formData.nit} onChange={(e) => { const value = e.target.value.replace(/[^0-9-]/g, '').slice(0,12); handleChange('nit', value); }} inputProps={{ maxLength: 12 }} placeholder="900123456-7" error={!!errors.nit} helperText={errors.nit || "Máximo 12 caracteres"} />
            </Grid>
          )}
          <Grid item xs={12} sm={formData.personType === 'NATURAL' ? 6 : 12}>
            <TextField fullWidth label="Encargado" value={formData.encargado} onChange={(e) => handleChange('encargado', e.target.value)} placeholder="Persona de contacto" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField required fullWidth type="email" label="Email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} error={!!errors.email} helperText={errors.email} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Dirección" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Celular" value={formData.phone} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0,10); handleChange('phone', val); }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Teléfono Fijo" value={formData.landlinePhone} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0,10); handleChange('landlinePhone', val); }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete options={departments} getOptionLabel={(opt) => opt.name} value={departments.find((d) => d.id === formData.departmentId) || null} onChange={(_, val) => handleChange('departmentId', val?.id || '')} loading={departmentsQuery.isLoading} renderInput={(params) => <TextField {...params} required label="Departamento" error={!!errors.departmentId} helperText={errors.departmentId} />} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete options={cities} getOptionLabel={(opt) => opt.name} value={cities.find((c) => c.id === formData.cityId) || null} onChange={(_, val) => handleChange('cityId', val?.id || '')} disabled={!formData.departmentId || cities.length === 0} renderInput={(params) => <TextField {...params} required label="Ciudad" error={!!errors.cityId} helperText={errors.cityId} />} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={createSupplierMutation.isPending}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={createSupplierMutation.isPending}>
          {createSupplierMutation.isPending ? <CircularProgress size={24} /> : 'Crear Proveedor'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
