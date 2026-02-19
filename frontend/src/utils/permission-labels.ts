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

  // Session Logs
  read_session_logs: 'Ver Historial de Sesiones',

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

  // Clientes
  create_clients: 'Crear Clientes',
  read_clients: 'Ver Clientes',
  update_clients: 'Actualizar Clientes',
  delete_clients: 'Eliminar Clientes',
  update_client_special_condition: 'Editar Condición Especial',

  // Proveedores
  create_suppliers: 'Crear Proveedores',
  read_suppliers: 'Ver Proveedores',
  update_suppliers: 'Actualizar Proveedores',
  delete_suppliers: 'Eliminar Proveedores',

  create_units_of_measure: 'Crear Unidades de Medida',
  read_units_of_measure: 'Ver Unidades de Medida',
  update_units_of_measure: 'Actualizar Unidades de Medida',
  delete_units_of_measure: 'Eliminar Unidades de Medida',

  create_product_categories: 'Crear Categorías de Productos',
  read_product_categories: 'Ver Categorías de Productos',
  update_product_categories: 'Actualizar Categorías de Productos',
  delete_product_categories: 'Eliminar Categorías de Productos',

  create_products: 'Crear Productos',
  read_products: 'Ver Productos',
  update_products: 'Actualizar Productos',
  delete_products: 'Eliminar Productos',

  create_supply_categories: 'Crear Categorías de Insumos',
  read_supply_categories: 'Ver Categorías de Insumos',
  update_supply_categories: 'Actualizar Categorías de Insumos',
  delete_supply_categories: 'Eliminar Categorías de Insumos',

  create_supplies: 'Crear Insumos',
  read_supplies: 'Ver Insumos',
  update_supplies: 'Actualizar Insumos',
  delete_supplies: 'Eliminar Insumos',
  
  // Áreas de Producción
  create_production_areas: 'Crear Áreas de Producción',
  read_production_areas: 'Ver Áreas de Producción',
  update_production_areas: 'Actualizar Áreas de Producción',
  delete_production_areas: 'Eliminar Áreas de Producción',
  
  // Canales Comerciales
  create_commercial_channels: 'Crear Canales Comerciales',
  read_commercial_channels: 'Ver Canales Comerciales',
  update_commercial_channels: 'Actualizar Canales Comerciales',
  delete_commercial_channels: 'Eliminar Canales Comerciales',

  // Cotizaciones
  create_quotes: 'Crear Cotizaciones',
  read_quotes: 'Ver Cotizaciones',
  update_quotes: 'Actualizar Cotizaciones',
  delete_quotes: 'Eliminar Cotizaciones',
  convert_quotes: 'Convertir Cotizaciones',
   // Órdenes
   create_orders: 'Crear Órdenes',
   read_orders: 'Ver Órdenes',
   update_orders: 'Actualizar Órdenes',
   delete_orders: 'Eliminar Órdenes',
   approve_orders: 'Aprobar Órdenes',
   read_pending_orders: 'Ver Órdenes Pendientes de Pago',
   apply_discounts: 'Aplicar Descuentos',
   delete_discounts: 'Eliminar Descuentos',

  // Compañía
  read_company: 'Ver Información de Compañía',
  update_company: 'Editar Información de Compañía',
};

/**
 * Función helper para obtener el nombre legible de un permiso
 */
export const getPermissionLabel = (name: string): string => {
  return PERMISSION_LABELS[name] || name;
};
