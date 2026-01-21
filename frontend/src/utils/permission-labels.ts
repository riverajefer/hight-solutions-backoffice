/**
 * Mapeo de nombres técnicos de permisos a etiquetas legibles en español
 */
export const PERMISSION_LABELS: Record<string, string> = {
  // Usuarios
  create_users: 'Crear Usuarios',
  read_users: 'Ver Usuarios',
  update_users: 'Actualizar Usuarios',
  delete_users: 'Eliminar Usuarios',

  // Roles
  create_roles: 'Crear Roles',
  read_roles: 'Ver Roles',
  update_roles: 'Actualizar Roles',
  delete_roles: 'Eliminar Roles',

  // Permisos
  create_permissions: 'Crear Permisos',
  read_permissions: 'Ver Permisos',
  update_permissions: 'Actualizar Permisos',
  delete_permissions: 'Eliminar Permisos',
  manage_permissions: 'Gestionar Permisos de Roles',

  // Auditoría
  read_audit_logs: 'Ver Logs de Auditoría',

  // Áreas
  create_areas: 'Crear Áreas',
  read_areas: 'Ver Áreas',
  update_areas: 'Actualizar Áreas',
  delete_areas: 'Eliminar Áreas',

  // Cargos
  create_cargos: 'Crear Cargos',
  read_cargos: 'Ver Cargos',
  update_cargos: 'Actualizar Cargos',
  delete_cargos: 'Eliminar Cargos',
};

/**
 * Función helper para obtener el nombre legible de un permiso
 */
export const getPermissionLabel = (name: string): string => {
  return PERMISSION_LABELS[name] || name;
};
