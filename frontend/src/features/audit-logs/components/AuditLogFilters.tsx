import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { AuditLogFilters as Filters } from '../../../types';

interface AuditLogFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClearFilters: () => void;
}

/**
 * Componente de filtros para logs de auditoría
 */
export const AuditLogFilters: React.FC<AuditLogFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const handleFilterChange = (field: keyof Filters, value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  const actions = [
    { value: '', label: 'Todas' },
    { value: 'create', label: 'Crear' },
    { value: 'update', label: 'Actualizar' },
    { value: 'delete', label: 'Eliminar' },
    { value: 'login', label: 'Inicio de sesión' },
    { value: 'logout', label: 'Cierre de sesión' },
  ];

  const models = [
    { value: '', label: 'Todos' },
    { value: 'User', label: 'Usuario' },
    { value: 'Role', label: 'Rol' },
    { value: 'Permission', label: 'Permiso' },
    { value: 'RolePermission', label: 'Permiso de Rol' },
  ];

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <FilterListIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">Filtros</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            select
            label="Acción"
            value={filters.action || ''}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            size="small"
          >
            {actions.map((action) => (
              <MenuItem key={action.value} value={action.value}>
                {action.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            select
            label="Recurso"
            value={filters.model || ''}
            onChange={(e) => handleFilterChange('model', e.target.value)}
            size="small"
          >
            {models.map((model) => (
              <MenuItem key={model.value} value={model.value}>
                {model.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            type="date"
            label="Fecha desde"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            type="date"
            label="Fecha hasta"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={onClearFilters}
            >
              Limpiar Filtros
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};
