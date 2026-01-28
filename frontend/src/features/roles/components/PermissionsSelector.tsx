import React from 'react';
import {
  Box,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Paper,
  Typography,
  Grid,
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
  Usuarios: ['create_users', 'read_users', 'update_users', 'delete_users'],
  Clientes: [
    'create_clients',
    'read_clients',
    'update_clients',
    'delete_clients',
  ],
  Proveedores: [
    'create_suppliers',
    'read_suppliers',
    'update_suppliers',
    'delete_suppliers',
  ],
  'Unidades de medida': [
    'create_units_of_measure',
    'read_units_of_measure',
    'update_units_of_measure',
    'delete_units_of_measure',
  ],
  'Categorías de Servicios': [
    'create_service_categories',
    'read_service_categories',
    'update_service_categories',
    'delete_service_categories',
  ],
  Servicios: [
    'create_services',
    'read_services',
    'update_services',
    'delete_services',
  ],
  'Categorías de Insumos': [
    'create_supply_categories',
    'read_supply_categories',
    'update_supply_categories',
    'delete_supply_categories',
  ],
  Insumos: [
    'create_supplies',
    'read_supplies',
    'update_supplies',
    'delete_supplies',
  ],

  Roles: ['create_roles', 'read_roles', 'update_roles', 'delete_roles'],
  Permisos: [
    'create_permissions',
    'read_permissions',
    'update_permissions',
    'delete_permissions',
    'manage_permissions',
  ],
  Áreas: ['create_areas', 'read_areas', 'update_areas', 'delete_areas'],
  Cargos: ['create_cargos', 'read_cargos', 'update_cargos', 'delete_cargos'],
  Auditoría: ['read_audit_logs'],
};

/**
 * Selector de permisos con agrupación
 */
export const PermissionsSelector: React.FC<PermissionsSelectorProps> = ({
  selectedPermissions,
  onSelectPermissions,
  disabled = false,
}) => {
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

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 2 }}>
        Permisos
      </Typography>

      <Grid container spacing={3}>
        {Object.entries(PERMISSION_GROUPS).map(
          ([groupName, permissionNames]) => (
            <Grid item xs={12} sm={6} key={groupName}>
              <Paper sx={{ p: 2 }}>
                <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 1 }}>
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
                            checked={selectedPermissions.includes(
                              permission.id,
                            )}
                            onChange={(e) =>
                              handlePermissionChange(
                                permission.id,
                                e.target.checked,
                              )
                            }
                            disabled={disabled}
                          />
                        }
                        label={getPermissionLabel(permission.name)}
                      />
                    );
                  })}
                </FormGroup>
              </Paper>
            </Grid>
          ),
        )}
      </Grid>
    </Box>
  );
};
