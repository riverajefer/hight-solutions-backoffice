import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('devuelve el valor inicial de inmediato', () => {
    const { result } = renderHook(() => useDebounce('a', 300));
    expect(result.current).toBe('a');
  });

  it('no actualiza el valor antes de que pase el delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'b' });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('a');
  });

  it('actualiza el valor cuando transcurre el delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'b' });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('b');
  });

  it('reinicia el temporizador ante cambios rápidos (solo aplica el último)', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'b' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ v: 'c' });
    act(() => vi.advanceTimersByTime(200));
    // No han pasado 300ms desde el último cambio → sigue siendo 'a'
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('c');
  });
});
