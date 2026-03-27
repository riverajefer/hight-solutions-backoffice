import React, { useMemo, useState } from 'react';
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
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
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
  Clientes: ['browse_clients', 'create_clients', 'read_clients', 'update_clients', 'delete_clients', 'update_client_special_condition', 'approve_client_ownership_auth'],
  Cotizaciones: ['create_quotes', 'read_quotes', 'update_quotes', 'delete_quotes', 'convert_quotes', 'manage_quote_columns', 'read_all_quotes'],
  Órdenes: ['create_orders', 'read_orders', 'update_orders', 'delete_orders', 'approve_orders', 'change_order_status', 'register_order_payments', 'approve_discounts', 'apply_discounts', 'delete_discounts', 'read_pending_orders'],
  'Canales Comerciales': ['create_commercial_channels', 'read_commercial_channels', 'update_commercial_channels', 'delete_commercial_channels'],
  Archivos: ['upload_files', 'read_files', 'delete_files', 'manage_storage'],

  // Inventario y Catálogos
  Movimientos: ['create_inventory_movements', 'read_inventory_movements', 'manage_inventory'],
  Proveedores: ['create_suppliers', 'read_suppliers', 'update_suppliers', 'delete_suppliers'],
  Productos: ['create_products', 'read_products', 'update_products', 'delete_products'],
  'Categorías de Productos': ['create_product_categories', 'read_product_categories', 'update_product_categories', 'delete_product_categories'],
  Insumos: ['create_supplies', 'read_supplies', 'update_supplies', 'delete_supplies'],
  'Categorías de Insumos': ['create_supply_categories', 'read_supply_categories', 'update_supply_categories', 'delete_supply_categories'],
  'Unidades de medida': ['create_units_of_measure', 'read_units_of_measure', 'update_units_of_measure', 'delete_units_of_measure'],
  
  // Producción 
  'Áreas de Producción': ['create_production_areas', 'read_production_areas', 'update_production_areas', 'delete_production_areas'],
  'Órdenes de Trabajo': ['create_work_orders', 'read_work_orders', 'update_work_orders', 'delete_work_orders'],
  'Plantillas de Producto': ['read_product_templates', 'create_product_templates', 'update_product_templates', 'delete_product_templates'],
  'Etapas de Producción': ['read_step_definitions', 'create_step_definitions', 'update_step_definitions'],
  'Órdenes de Producción': ['read_production_orders', 'create_production_orders', 'update_production_orders'],

  // Gastos y Pagos
  'Tipos de Gasto': ['create_expense_types', 'read_expense_types', 'update_expense_types', 'delete_expense_types'],
  'Órdenes de Gasto': ['create_expense_orders', 'read_expense_orders', 'update_expense_orders', 'delete_expense_orders', 'approve_expense_orders'],
  Anticipos: ['approve_advance_payments'],
  
  // Auditoría y Control
  Auditoría: ['read_audit_logs', 'read_session_logs'],
  Asistencia: ['use_attendance', 'read_attendance', 'manage_attendance'],

  // Compañía
  Compañía: ['read_company', 'update_company'],

  // Comentarios
  Comentarios: ['create_comments', 'read_comments', 'delete_comments'],

  // Nómina
  'Empleados de Nómina': [
    'create_payroll_employees',
    'read_payroll_employees',
    'update_payroll_employees',
    'delete_payroll_employees',
  ],
  'Periodos de Nómina': [
    'create_payroll_periods',
    'read_payroll_periods',
    'update_payroll_periods',
    'delete_payroll_periods',
  ],

  Otros: [],
};

// Mapeo de Tabs a grupos
const TABS = [
  {
    label: 'Administración',
    groups: ['Usuarios', 'Roles', 'Permisos', 'Cargos', 'Áreas'],
  },
  {
    label: 'Comercial',
    groups: ['Clientes', 'Cotizaciones', 'Órdenes', 'Canales Comerciales', 'Archivos'],
  },
  {
    label: 'Inventario',
    groups: [
      'Movimientos',
      'Proveedores',
      'Productos',
      'Categorías de Productos',
      'Insumos',
      'Categorías de Insumos',
      'Unidades de medida',
    ],
  },
  {
    label: 'Producción',
    groups: ['Áreas de Producción', 'Órdenes de Trabajo', 'Plantillas de Producto', 'Etapas de Producción', 'Órdenes de Producción'],
  },
  {
    label: 'Gastos y Pagos',
    groups: ['Tipos de Gasto', 'Órdenes de Gasto', 'Anticipos'],
  },
  {
    label: 'Nómina',
    groups: ['Empleados de Nómina', 'Periodos de Nómina'],
  },
  {
    label: 'Configuración y Otros',
    groups: [
      'Auditoría',
      'Asistencia',
      'Compañía',
      'Comentarios',
      'Otros',
    ],
  },
];

export const PermissionsSelector: React.FC<PermissionsSelectorProps> = ({
  selectedPermissions,
  onSelectPermissions,
  disabled = false,
}) => {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionsApi.getAll(),
  });

  const configuredPermissionNames = useMemo(
    () => new Set(Object.values(PERMISSION_GROUPS).flat()),
    [],
  );

  const uncategorizedPermissionNames = useMemo(
    () =>
      permissions
        .map((permission: Permission) => permission.name)
        .filter((name) => !configuredPermissionNames.has(name)),
    [permissions, configuredPermissionNames],
  );

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

  const getPermissionNamesForGroup = (groupName: string): string[] => {
    if (groupName === 'Otros') {
      return uncategorizedPermissionNames;
    }

    return PERMISSION_GROUPS[groupName] || [];
  };

  const shouldShowGroup = (groupName: string): boolean => {
    if (groupName === 'Otros') {
      return uncategorizedPermissionNames.length > 0;
    }

    return true;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Select all / Deselect all for current tab
  const handleSelectAllInTab = (checked: boolean) => {
    const currentGroups = TABS[currentTab].groups.filter(shouldShowGroup);
    const permissionsInTab: string[] = [];

    currentGroups.forEach(groupName => {
      const groupPermissions = getPermissionNamesForGroup(groupName);
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
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar un permiso (ej. Crear Usuarios, Órdenes...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {!searchTerm && (
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
      )}

      {/* Select All Checkbox for current Tab (only visible when not searching) */}
      {!searchTerm && (
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
      )}

      <Box role="tabpanel">
        <Grid container spacing={3}>
          {(searchTerm 
            ? Object.keys(PERMISSION_GROUPS).filter(shouldShowGroup)
            : TABS[currentTab].groups.filter(shouldShowGroup)
          ).map((groupName) => {
            const permissionNames = getPermissionNamesForGroup(groupName);
            if (!permissionNames) return null;

            const allPermissions = permissionNames
              .map((permName) => permissionMap[permName])
              .filter((permission): permission is Permission => Boolean(permission));

            // Filtering by search term
            const availablePermissions = allPermissions.filter((permission) => {
              if (!searchTerm) return true;
              const label = getPermissionLabel(permission.name).toLowerCase();
              const term = searchTerm.toLowerCase();
              return label.includes(term) || permission.name.toLowerCase().includes(term);
            });

            const missingPermissionNames = permissionNames.filter(
              (permName) => !permissionMap[permName],
            );

            // Hide the group if there are no matching permissions during search
            if (searchTerm && availablePermissions.length === 0) {
              return null;
            }

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
                    {availablePermissions.map((permission) => (
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
                    ))}

                    {availablePermissions.length === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        No hay permisos disponibles para este grupo en este ambiente.
                      </Typography>
                    )}

                    {missingPermissionNames.length > 0 && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                        Faltan permisos en la base de datos: {missingPermissionNames.join(', ')}
                      </Typography>
                    )}
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
