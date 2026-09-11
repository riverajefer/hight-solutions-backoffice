import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { importWithRetry } from './lazyWithRetry';
import { isChunkLoadError } from './chunkError';

describe('importWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Adelanta los temporizadores mientras la promesa sigue pendiente. */
  async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
    const settled = promise.catch((error: unknown) => ({ __error: error }));
    await vi.runAllTimersAsync();
    const result = (await settled) as T | { __error: unknown };

    if (result && typeof result === 'object' && '__error' in result) {
      throw (result as { __error: unknown }).__error;
    }

    return result as T;
  }

  it('devuelve el módulo cuando el import funciona a la primera', async () => {
    const factory = vi.fn().mockResolvedValue({ default: 'Página' });

    await expect(runWithTimers(importWithRetry(factory))).resolves.toEqual({
      default: 'Página',
    });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('reintenta y se recupera de un fallo transitorio de red', async () => {
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue({ default: 'Página' });

    await expect(runWithTimers(importWithRetry(factory))).resolves.toEqual({
      default: 'Página',
    });
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('agota los intentos y lanza un error etiquetado como ChunkLoadError', async () => {
    const factory = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(runWithTimers(importWithRetry(factory))).rejects.toMatchObject(
      { name: 'ChunkLoadError' },
    );
    // Un intento inicial + 2 reintentos
    expect(factory).toHaveBeenCalledTimes(3);
  });

  it('el error resultante es reconocible por isChunkLoadError', async () => {
    const factory = vi
      .fn()
      // Mensaje que NO coincide con ningún patrón conocido: es justo el caso
      // que la detección por texto no cubría.
      .mockRejectedValue(new Error('Load failed'));

    const error = await runWithTimers(importWithRetry(factory)).catch(
      (e: unknown) => e,
    );

    expect(isChunkLoadError(error)).toBe(true);
  });

  it('conserva el error original como causa', async () => {
    const original = new Error('Load failed');
    const factory = vi.fn().mockRejectedValue(original);

    const error = (await runWithTimers(importWithRetry(factory)).catch(
      (e: unknown) => e,
    )) as Error & { cause?: unknown };

    expect(error.cause).toBe(original);
    expect(error.message).toContain('Load failed');
  });

  it('respeta un número de reintentos personalizado', async () => {
    const factory = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(
      runWithTimers(importWithRetry(factory, 0)),
    ).rejects.toMatchObject({ name: 'ChunkLoadError' });
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
