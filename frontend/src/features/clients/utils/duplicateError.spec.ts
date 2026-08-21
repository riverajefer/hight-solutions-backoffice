import { describe, it, expect } from 'vitest';
import { extractDuplicateMatches } from './duplicateError';

describe('extractDuplicateMatches', () => {
  it('devuelve las coincidencias en un 409 POSSIBLE_DUPLICATE', () => {
    const matches = [{ id: 'c1', name: 'ACME' }];
    const err = { response: { status: 409, data: { code: 'POSSIBLE_DUPLICATE', matches } } };
    expect(extractDuplicateMatches(err)).toBe(matches);
  });

  it('devuelve null para errores que no son 409', () => {
    const err = { response: { status: 400, data: { code: 'POSSIBLE_DUPLICATE', matches: [] } } };
    expect(extractDuplicateMatches(err)).toBeNull();
  });

  it('devuelve null si el 409 no trae el código esperado', () => {
    const err = { response: { status: 409, data: { code: 'OTRO', matches: [] } } };
    expect(extractDuplicateMatches(err)).toBeNull();
  });

  it('devuelve null si matches no es un arreglo', () => {
    const err = { response: { status: 409, data: { code: 'POSSIBLE_DUPLICATE', matches: 'x' } } };
    expect(extractDuplicateMatches(err)).toBeNull();
  });

  it('devuelve null para un error sin response', () => {
    expect(extractDuplicateMatches(new Error('boom'))).toBeNull();
    expect(extractDuplicateMatches(undefined)).toBeNull();
  });
});
