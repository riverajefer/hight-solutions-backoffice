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
import { useClients } from '../../clients/hooks/useClients';
import { useDepartments, useCitiesByDepartment } from '../../locations/hooks/useLocations';
import type { Client, PersonType } from '../../../types/client.types';

interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (client: Client) => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  landlinePhone?: string;
  personType: PersonType;
  departmentId: string;
  cityId: string;
  nit?: string;
  cedula?: string;
  manager?: string;
  encargado?: string;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { createClientMutation } = useClients();
  const departmentsQuery = useDepartments();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    landlinePhone: '',
    personType: 'NATURAL',
    departmentId: '',
    cityId: '',
    nit: '',
    cedula: '',
    manager: '',
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
      // Reset cityId when department changes
      ...(field === 'departmentId' && { cityId: '' }),
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Set default Department (Cundinamarca)
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

  // Set default City (Bogotá)
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

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'El celular es requerido';
    } else if (formData.phone.length !== 10) {
      newErrors.phone = 'El celular debe tener exactamente 10 dígitos';
    }

    if (formData.landlinePhone && formData.landlinePhone.trim() && formData.landlinePhone.length !== 10) {
      newErrors.landlinePhone = 'El teléfono fijo debe tener exactamente 10 dígitos';
    }
    if (!formData.departmentId) {
      newErrors.departmentId = 'El departamento es requerido';
    }
    if (!formData.cityId) {
      newErrors.cityId = 'La ciudad es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const client = await createClientMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        personType: formData.personType,
        departmentId: formData.departmentId,
        cityId: formData.cityId,
        ...(formData.landlinePhone && { landlinePhone: formData.landlinePhone }),
        ...(formData.nit && { nit: formData.nit }),
        ...(formData.cedula && { cedula: formData.cedula }),
        ...(formData.manager && { manager: formData.manager }),
        ...(formData.encargado && { encargado: formData.encargado }),
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        landlinePhone: '',
        personType: 'NATURAL',
        departmentId: '',
        cityId: '',
        nit: '',
        cedula: '',
        manager: '',
        encargado: '',
      });
      setErrors({});

      onSuccess(client);
    } catch (error) {
      // Error is handled by the mutation hook (notistack)
      console.error('Error creating client:', error);
    }
  };

  const handleClose = () => {
    if (!createClientMutation.isPending) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        landlinePhone: '',
        personType: 'NATURAL',
        departmentId: '',
        cityId: '',
        nit: '',
        cedula: '',
        manager: '',
        encargado: '',
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Crear Nuevo Cliente</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Tipo de Persona */}
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Tipo de Persona"
              value={formData.personType}
              onChange={(e) =>
                handleChange('personType', e.target.value as PersonType)
              }
            >
              <MenuItem value="NATURAL">Persona Natural</MenuItem>
              <MenuItem value="EMPRESA">Empresa</MenuItem>
            </TextField>
          </Grid>

          {/* Nombre */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label={
                formData.personType === 'EMPRESA'
                  ? 'Razón Social'
                  : 'Nombre Completo'
              }
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>

          {/* Cédula yo NIT (solo para persona natural) */}
          {formData.personType === 'NATURAL' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cédula o nit"
                value={formData.cedula}
                onChange={(e) => {  
                  const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                  handleChange('cedula', value);
                }}
                placeholder="1234567890"
                helperText="Número de cédula de ciudadanía"
              />
            </Grid>
          )}

          {/* NIT (solo para empresas) */}
          {formData.personType === 'EMPRESA' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="NIT"
                value={formData.nit}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  handleChange('nit', value);
                }}
                inputProps={{ maxLength: 10 }}
                placeholder="1234567890"
                helperText="Máximo 10 dígitos"
              />
            </Grid>
          )}

          {/* Representante Legal (solo para empresas) */}
          {formData.personType === 'EMPRESA' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Representante Legal"
                value={formData.manager}
                onChange={(e) => handleChange('manager', e.target.value)}
                placeholder="Nombre del representante legal"
              />
            </Grid>
          )}

          {/* Encargado (campo común para ambos tipos) */}
          <Grid item xs={12} sm={formData.personType === 'NATURAL' ? 6 : 12}>
            <TextField
              fullWidth
              label="Encargado"
              value={formData.encargado}
              onChange={(e) => handleChange('encargado', e.target.value)}
              placeholder="Persona encargada del contacto"
              helperText="Persona de contacto directo"
            />
          </Grid>

          {/* Email */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              type="email"
              label="Email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
            />
          </Grid>

          {/* Número de celular */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Número de celular"
              value={formData.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                handleChange('phone', value);
              }}
              error={!!errors.phone}
              helperText={errors.phone || 'Máximo 10 dígitos'}
              placeholder="3001234567"
              inputProps={{ maxLength: 10 }}
            />
          </Grid>

          {/* Teléfono fijo */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Teléfono fijo"
              value={formData.landlinePhone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                handleChange('landlinePhone', value);
              }}
              placeholder="6012345678"
              helperText="Opcional - Máximo 10 dígitos"
              inputProps={{ maxLength: 10 }}
            />
          </Grid>

          {/* Departamento */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={departments}
              getOptionLabel={(option) => option.name}
              value={
                departments.find((d) => d.id === formData.departmentId) || null
              }
              onChange={(_, newValue) =>
                handleChange('departmentId', newValue?.id || '')
              }
              loading={departmentsQuery.isLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Departamento"
                  error={!!errors.departmentId}
                  helperText={errors.departmentId}
                />
              )}
            />
          </Grid>

          {/* Ciudad */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={cities}
              getOptionLabel={(option) => option.name}
              value={cities.find((c) => c.id === formData.cityId) || null}
              onChange={(_, newValue) =>
                handleChange('cityId', newValue?.id || '')
              }
              disabled={!formData.departmentId || cities.length === 0}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Ciudad"
                  error={!!errors.cityId}
                  helperText={errors.cityId}
                  placeholder={
                    !formData.departmentId
                      ? 'Seleccione un departamento primero'
                      : 'Seleccione una ciudad'
                  }
                />
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={createClientMutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={createClientMutation.isPending}
        >
          {createClientMutation.isPending ? (
            <CircularProgress size={24} />
          ) : (
            'Crear Cliente'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
