import React, { useState } from 'react';
import {
  Box,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Paper,
  Typography,
  Grid,
  Tabs,
  Tab,
  useTheme,
  alpha,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { permissionsApi } from '../../../api';
import { Permission } from '../../../types';
import { getPermissionLabel } from '../../../utils/permission-labels';

interface PermissionsSelectorProps {
  selectedPermissions: string[];
  onSelectPermissions: (permissions: string[]) => void;
  disabled?: boolean;
}

const PERMISSION_GROUPS: Record<string, string[]> = {
  // Gestión de Usuarios y Accesos
  Usuarios: ['create_users', 'read_users', 'update_users', 'delete_users'],
  Roles: ['create_roles', 'read_roles', 'update_roles', 'delete_roles'],
  Permisos: [
    'create_permissions',
    'read_permissions',
    'update_permissions',
    'delete_permissions',
    'manage_permissions',
  ],
  Cargos: ['create_cargos', 'read_cargos', 'update_cargos', 'delete_cargos'],
  Áreas: ['create_areas', 'read_areas', 'update_areas', 'delete_areas'],

  // Comercial
  Clientes: ['create_clients', 'read_clients', 'update_clients', 'delete_clients'],
  Cotizaciones: ['create_quotes', 'read_quotes', 'update_quotes', 'delete_quotes', 'convert_quotes'],
  Órdenes: ['create_orders', 'read_orders', 'update_orders', 'delete_orders'],
  'Canales Comerciales': ['create_commercial_channels', 'read_commercial_channels', 'update_commercial_channels', 'delete_commercial_channels'],

  // Inventario y Catálogos
  Proveedores: ['create_suppliers', 'read_suppliers', 'update_suppliers', 'delete_suppliers'],
  Servicios: ['create_services', 'read_services', 'update_services', 'delete_services'],
  'Categorías de Servicios': ['create_service_categories', 'read_service_categories', 'update_service_categories', 'delete_service_categories'],
  Insumos: ['create_supplies', 'read_supplies', 'update_supplies', 'delete_supplies'],
  'Categorías de Insumos': ['create_supply_categories', 'read_supply_categories', 'update_supply_categories', 'delete_supply_categories'],
  'Unidades de medida': ['create_units_of_measure', 'read_units_of_measure', 'update_units_of_measure', 'delete_units_of_measure'],
  
  // Producción y Otros
  'Áreas de Producción': ['create_production_areas', 'read_production_areas', 'update_production_areas', 'delete_production_areas'],
  Auditoría: ['read_audit_logs'],
};

// Mapeo de Tabs a grupos
const TABS = [
  {
    label: 'Administración',
    groups: ['Usuarios', 'Roles', 'Permisos', 'Cargos', 'Áreas'],
  },
  {
    label: 'Comercial',
    groups: ['Clientes', 'Cotizaciones', 'Órdenes', 'Canales Comerciales'],
  },
  {
    label: 'Inventario',
    groups: [
      'Proveedores',
      'Servicios',
      'Categorías de Servicios',
      'Insumos',
      'Categorías de Insumos',
      'Unidades de medida',
    ],
  },
  {
    label: 'Producción y Otros',
    groups: ['Áreas de Producción', 'Auditoría'],
  },
];

export const PermissionsSelector: React.FC<PermissionsSelectorProps> = ({
  selectedPermissions,
  onSelectPermissions,
  disabled = false,
}) => {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionsApi.getAll(),
  });

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      onSelectPermissions([...selectedPermissions, permissionId]);
    } else {
      onSelectPermissions(
        selectedPermissions.filter((p) => p !== permissionId),
      );
    }
  };

  const permissionMap = permissions.reduce(
    (acc, p: Permission) => {
      acc[p.name] = p;
      return acc;
    },
    {} as Record<string, Permission>,
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Select all / Deselect all for current tab
  const handleSelectAllInTab = (checked: boolean) => {
    const currentGroups = TABS[currentTab].groups;
    const permissionsInTab: string[] = [];

    currentGroups.forEach(groupName => {
      const groupPermissions = PERMISSION_GROUPS[groupName];
      if (groupPermissions) {
        groupPermissions.forEach(permName => {
          const perm = permissionMap[permName];
          if (perm) permissionsInTab.push(perm.id);
        });
      }
    });

    if (checked) {
      // Add all from this tab that aren't already selected
      const newSelected = [...selectedPermissions];
      permissionsInTab.forEach(pid => {
        if (!newSelected.includes(pid)) newSelected.push(pid);
      });
      onSelectPermissions(newSelected);
    } else {
      // Remove all from this tab
      const newSelected = selectedPermissions.filter(pid => !permissionsInTab.includes(pid));
      onSelectPermissions(newSelected);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 48,
            }
          }}
        >
          {TABS.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {/* Select All Checkbox for current Tab */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControlLabel
          control={
            <Checkbox
              onChange={(e) => handleSelectAllInTab(e.target.checked)}
              disabled={disabled}
              size="small"
            />
          }
          label={<Typography variant="body2" color="text.secondary">Seleccionar todo en esta pestaña</Typography>}
        />
      </Box>

      <Box role="tabpanel">
        <Grid container spacing={3}>
          {TABS[currentTab].groups.map((groupName) => {
            const permissionNames = PERMISSION_GROUPS[groupName];
            if (!permissionNames) return null;

            return (
              <Grid item xs={12} sm={6} md={4} key={groupName}>
                <Paper 
                  variant="outlined"
                  sx={{ 
                    p: 2, 
                    height: '100%',
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    borderColor: alpha(theme.palette.divider, 0.5)
                  }}
                >
                  <Typography 
                    variant='subtitle2' 
                    sx={{ 
                      fontWeight: 700, 
                      mb: 1.5,
                      color: 'primary.main',
                      textTransform: 'uppercase',
                      fontSize: '0.75rem',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {groupName}
                  </Typography>
                  <FormGroup>
                    {permissionNames.map((permName) => {
                      const permission = permissionMap[permName];
                      if (!permission) return null;

                      return (
                        <FormControlLabel
                          key={permission.id}
                          control={
                            <Checkbox
                              checked={selectedPermissions.includes(permission.id)}
                              onChange={(e) =>
                                handlePermissionChange(
                                  permission.id,
                                  e.target.checked,
                                )
                              }
                              disabled={disabled}
                              size="small"
                              sx={{ py: 0.5 }}
                            />
                          }
                          label={
                            <Typography variant="body2">
                              {getPermissionLabel(permission.name)}
                            </Typography>
                          }
                          sx={{ mb: 0.5, ml: -0.5 }}
                        />
                      );
                    })}
                  </FormGroup>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
};
