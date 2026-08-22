import { beforeEach, describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => localStorage.clear());

  it('usa el valor inicial cuando no hay nada guardado', () => {
    const { result } = renderHook(() => useLocalStorage('k', 'inicial'));
    expect(result.current[0]).toBe('inicial');
  });

  it('lee el valor previamente guardado en localStorage', () => {
    localStorage.setItem('k', JSON.stringify('guardado'));
    const { result } = renderHook(() => useLocalStorage('k', 'inicial'));
    expect(result.current[0]).toBe('guardado');
  });

  it('setValue actualiza el estado y persiste en localStorage', () => {
    const { result } = renderHook(() => useLocalStorage<number>('contador', 0));

    act(() => result.current[1](5));

    expect(result.current[0]).toBe(5);
    expect(localStorage.getItem('contador')).toBe('5');
  });

  it('cae al valor inicial si el JSON almacenado es inválido', () => {
    localStorage.setItem('k', '{corrupto');
    const { result } = renderHook(() => useLocalStorage('k', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });
});
