import { describe, it, expect } from 'vitest';
import { getFriendlyErrorMessage, ERROR_MESSAGES } from './error-messages';

describe('getFriendlyErrorMessage', () => {
  it('traduce un mensaje conocido del backend', () => {
    expect(getFriendlyErrorMessage('Invalid credentials')).toBe('Credenciales inválidas');
    expect(getFriendlyErrorMessage('Forbidden')).toBe(
      'No tienes permisos para realizar esta acción',
    );
  });

  it('devuelve el mensaje original si no hay traducción', () => {
    expect(getFriendlyErrorMessage('Algo muy específico')).toBe('Algo muy específico');
  });

  it('toma el primer elemento cuando recibe un array (errores de validación NestJS)', () => {
    expect(
      getFriendlyErrorMessage(['email must be an email', 'password should not be empty']),
    ).toBe('El correo electrónico debe ser válido');
  });

  it('devuelve "Error desconocido" para valores no string', () => {
    expect(getFriendlyErrorMessage(undefined)).toBe('Error desconocido');
    expect(getFriendlyErrorMessage({ any: 'thing' })).toBe('Error desconocido');
    expect(getFriendlyErrorMessage(500)).toBe('Error desconocido');
  });

  it('el diccionario cubre los errores de auth principales', () => {
    expect(ERROR_MESSAGES['Invalid username or password']).toBe(
      'Usuario o contraseña incorrectos',
    );
  });
});
