import { describe, it, expect } from 'vitest';
import {
  formatFullName,
  formatDate,
  formatDateTime,
  getErrorMessage,
  createSlug,
} from './helpers';

describe('helpers', () => {
  describe('formatFullName', () => {
    it('une nombre y apellido', () => {
      expect(formatFullName('Ana', 'Gómez')).toBe('Ana Gómez');
    });

    it('usa solo el dato disponible', () => {
      expect(formatFullName('Ana')).toBe('Ana');
      expect(formatFullName(undefined, 'Gómez')).toBe('Gómez');
    });

    it('devuelve "Usuario" cuando no hay datos', () => {
      expect(formatFullName()).toBe('Usuario');
      expect(formatFullName('', '')).toBe('Usuario');
    });
  });

  describe('formatDate / formatDateTime', () => {
    it('formatea una fecha válida incluyendo el año', () => {
      expect(formatDate('2026-01-15T10:30:00')).toContain('2026');
      expect(formatDateTime('2026-01-15T10:30:00')).toContain('2026');
    });

    it('acepta objetos Date', () => {
      expect(formatDate(new Date('2026-01-15T10:30:00'))).toContain('2026');
    });
  });

  describe('getErrorMessage', () => {
    it('extrae el mensaje de una instancia de Error', () => {
      expect(getErrorMessage(new Error('boom'))).toBe('boom');
    });

    it('devuelve el string tal cual', () => {
      expect(getErrorMessage('texto de error')).toBe('texto de error');
    });

    it('mensaje por defecto para tipos desconocidos', () => {
      expect(getErrorMessage({ any: 'thing' })).toBe('Ocurrió un error desconocido');
      expect(getErrorMessage(null)).toBe('Ocurrió un error desconocido');
    });
  });

  describe('createSlug', () => {
    it('normaliza acentos y espacios', () => {
      expect(createSlug('Árbol Café')).toBe('arbol-cafe');
    });

    it('elimina caracteres especiales', () => {
      expect(createSlug('Hola, ¿Mundo!')).toBe('hola-mundo');
    });

    it('colapsa espacios múltiples en un solo guión', () => {
      expect(createSlug('  uno   dos  ')).toBe('uno-dos');
    });
  });
});
