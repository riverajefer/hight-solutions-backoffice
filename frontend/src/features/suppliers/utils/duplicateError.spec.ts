import { describe, it, expect } from 'vitest';
import { extractDuplicateNames } from './duplicateError';

describe('extractDuplicateNames', () => {
  it('devuelve los nombres de los proveedores en conflicto', () => {
    const err = {
      response: {
        status: 409,
        data: { code: 'POSSIBLE_DUPLICATE', matches: [{ name: 'ACME' }, { name: 'Globex' }] },
      },
    };
    expect(extractDuplicateNames(err)).toEqual(['ACME', 'Globex']);
  });

  it('devuelve null para errores que no son 409', () => {
    const err = { response: { status: 500, data: {} } };
    expect(extractDuplicateNames(err)).toBeNull();
  });

  it('devuelve null si el código no es POSSIBLE_DUPLICATE', () => {
    const err = { response: { status: 409, data: { code: 'X', matches: [] } } };
    expect(extractDuplicateNames(err)).toBeNull();
  });

  it('devuelve null si matches no es arreglo', () => {
    const err = { response: { status: 409, data: { code: 'POSSIBLE_DUPLICATE', matches: null } } };
    expect(extractDuplicateNames(err)).toBeNull();
  });

  it('devuelve null ante un error sin response', () => {
    expect(extractDuplicateNames(new Error('x'))).toBeNull();
  });
});
