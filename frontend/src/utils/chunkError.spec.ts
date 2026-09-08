import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  attemptChunkReload,
  canAttemptChunkReload,
  clearChunkReloadFlag,
  isChunkLoadError,
} from './chunkError';

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://crm/assets/OrderDetailPage-a1b2.js',
    "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of \"text/html\".",
    'Importing a module script failed.',
    'Loading chunk 42 failed.',
    'error loading dynamically imported module',
  ])('detecta el mensaje: %s', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('detecta por el nombre ChunkLoadError', () => {
    const error = new Error('boom');
    error.name = 'ChunkLoadError';
    expect(isChunkLoadError(error)).toBe(true);
  });

  it('acepta strings además de Error', () => {
    expect(isChunkLoadError('Failed to load module script')).toBe(true);
  });

  it('no marca errores de aplicación como fallo de chunk', () => {
    expect(
      isChunkLoadError(
        new TypeError("Cannot read properties of undefined (reading 'id')"),
      ),
    ).toBe(false);
  });

  it.each([null, undefined, '', 0])('ignora el valor %s', (value) => {
    expect(isChunkLoadError(value)).toBe(false);
  });
});

describe('guardia de recarga automática', () => {
  const reload = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockClear();
    vi.useFakeTimers();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('recarga en el primer fallo', () => {
    expect(attemptChunkReload()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('no recarga dos veces seguidas: evita el bucle infinito', () => {
    attemptChunkReload();
    reload.mockClear();

    expect(attemptChunkReload()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('vuelve a permitir la recarga pasado el cooldown', () => {
    attemptChunkReload();
    reload.mockClear();

    vi.advanceTimersByTime(31_000);

    expect(canAttemptChunkReload()).toBe(true);
    expect(attemptChunkReload()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('clearChunkReloadFlag rehabilita la auto-recuperación', () => {
    attemptChunkReload();
    reload.mockClear();

    clearChunkReloadFlag();

    expect(attemptChunkReload()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('no auto-recarga si sessionStorage no está disponible', () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('storage bloqueado');
      });

    expect(attemptChunkReload()).toBe(false);
    expect(reload).not.toHaveBeenCalled();

    setItem.mockRestore();
  });
});
