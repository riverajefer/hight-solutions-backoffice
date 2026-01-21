/**
 * Mapeo de mensajes de error del backend a mensajes amigables en español
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Errores de Usuarios/Auth
  'Email already registered': 'El correo electrónico ya está registrado',
  'Email already in use': 'El correo electrónico ya está en uso por otro usuario',
  'Invalid email or password': 'Correo electrónico o contraseña incorrectos',
  'Invalid credentials': 'Credenciales inválidas',
  'Invalid refresh token': 'Sesión expirada o inválida',
  'User not found': 'Usuario no encontrado',
  'Invalid role ID': 'El rol seleccionado no es válido',
  'Role already exists': 'El nombre del rol ya existe',
  'Role not found': 'Rol no encontrado',
  'Permission not found': 'Permiso no encontrado',
  'Bad Request': 'Solicitud incorrecta',
  'Unauthorized': 'No autorizado',
  'Forbidden': 'No tienes permisos para realizar esta acción',
  'Network Error': 'Error de conexión con el servidor',
  'Internal Server Error': 'Error interno del servidor',
  'password should not be empty': 'La contraseña no puede estar vacía',
  'email must be an email': 'El correo electrónico debe ser válido',
};

/**
 * Obtiene un mensaje de error amigable en español
 * @param message Mensaje original del backend o error de Axios
 * @returns Mensaje traducido o el original si no hay traducción
 */
export const getFriendlyErrorMessage = (message: any): string => {
  // Si el mensaje es un array (NestJS validation errors), tomar el primero
  if (Array.isArray(message)) {
    return getFriendlyErrorMessage(message[0]);
  }

  if (typeof message !== 'string') {
    return 'Error desconocido';
  }

  return ERROR_MESSAGES[message] || message;
};
