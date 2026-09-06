import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSingleFlight } from './useSingleFlight';

/** Promesa que se resuelve o rechaza cuando el test lo decida. */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useSingleFlight', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('ignora el segundo clic mientras el primero sigue en vuelo', async () => {
    const d = deferred<void>();
    const submit = vi.fn(() => d.promise);
    const { result } = renderHook(() => useSingleFlight(submit));

    // Los dos clics del mismo frame, antes de que React vuelva a renderizar.
    act(() => {
      void result.current();
      void result.current();
    });

    expect(submit).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve();
      await d.promise;
    });
  });

  it('vuelve a permitir el envío cuando el anterior terminó', async () => {
    const submit = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useSingleFlight(submit));

    await act(async () => {
      await result.current();
    });
    await act(async () => {
      await result.current();
    });

    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('reabre el candado si el envío falla, para poder reintentar', async () => {
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error('la red falló'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useSingleFlight(submit));

    await act(async () => {
      await result.current();
    });
    await act(async () => {
      await result.current();
    });

    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('no relanza el error: nadie recogería la promesa de un onClick', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSingleFlight(submit));

    await expect(result.current()).resolves.toBeUndefined();
  });

  it('con keepLockedOnSuccess deja el candado cerrado tras guardar', async () => {
    const submit = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() =>
      useSingleFlight(submit, { keepLockedOnSuccess: true }),
    );

    await act(async () => {
      await result.current();
    });
    await act(async () => {
      await result.current();
    });

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('pasa los argumentos al handler envuelto', async () => {
    const submit = vi.fn((id: string, monto: number) => Promise.resolve([id, monto]));
    const { result } = renderHook(() =>
      useSingleFlight((id: string, monto: number) => submit(id, monto)),
    );

    await act(async () => {
      await result.current('op-1', 5000);
    });

    expect(submit).toHaveBeenCalledWith('op-1', 5000);
  });
});
