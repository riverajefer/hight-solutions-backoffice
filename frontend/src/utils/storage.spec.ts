import { beforeEach, describe, it, expect } from 'vitest';
import {
  getFromStorage,
  saveToStorage,
  removeFromStorage,
  clearStorage,
} from './storage';

describe('storage utils', () => {
  beforeEach(() => localStorage.clear());

  describe('saveToStorage / getFromStorage', () => {
    it('guarda y recupera un objeto serializado', () => {
      saveToStorage('user', { id: 1, name: 'Ana' });
      expect(getFromStorage('user')).toEqual({ id: 1, name: 'Ana' });
    });

    it('devuelve el valor por defecto cuando la clave no existe', () => {
      expect(getFromStorage('missing', 'fallback')).toBe('fallback');
    });

    it('devuelve null cuando no existe y no hay valor por defecto', () => {
      expect(getFromStorage('missing')).toBeNull();
    });

    it('devuelve el valor por defecto si el JSON está corrupto', () => {
      localStorage.setItem('bad', '{no-es-json');
      expect(getFromStorage('bad', 'fallback')).toBe('fallback');
    });
  });

  describe('removeFromStorage', () => {
    it('elimina una clave', () => {
      saveToStorage('temp', 123);
      removeFromStorage('temp');
      expect(getFromStorage('temp')).toBeNull();
    });
  });

  describe('clearStorage', () => {
    it('limpia todo el almacenamiento', () => {
      saveToStorage('a', 1);
      saveToStorage('b', 2);
      clearStorage();
      expect(getFromStorage('a')).toBeNull();
      expect(getFromStorage('b')).toBeNull();
    });
  });
});
