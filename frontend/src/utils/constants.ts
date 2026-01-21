export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  THEME: 'theme',
};

export const PERMISSIONS = {
  CREATE_USERS: 'create_users',
  READ_USERS: 'read_users',
  UPDATE_USERS: 'update_users',
  DELETE_USERS: 'delete_users',
  CREATE_ROLES: 'create_roles',
  READ_ROLES: 'read_roles',
  UPDATE_ROLES: 'update_roles',
  DELETE_ROLES: 'delete_roles',
  CREATE_PERMISSIONS: 'create_permissions',
  READ_PERMISSIONS: 'read_permissions',
  UPDATE_PERMISSIONS: 'update_permissions',
  DELETE_PERMISSIONS: 'delete_permissions',
  MANAGE_PERMISSIONS: 'manage_permissions',
  READ_AUDIT_LOGS: 'read_audit_logs',
};

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  USERS_CREATE: '/users/create',
  USERS_EDIT: '/users/:id/edit',
  USERS_VIEW: '/users/:id',
  ROLES: '/roles',
  ROLES_CREATE: '/roles/create',
  ROLES_EDIT: '/roles/:id/edit',
  ROLES_PERMISSIONS: '/roles/:id/permissions',
  PERMISSIONS: '/permissions',
  PERMISSIONS_CREATE: '/permissions/create',
  PERMISSIONS_EDIT: '/permissions/:id/edit',
  AUDIT_LOGS: '/audit-logs',
  NOT_FOUND: '/not-found',
  UNAUTHORIZED: '/unauthorized',
};

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 10,
};
