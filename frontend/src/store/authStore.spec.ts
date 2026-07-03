import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthResponse, User } from '../types';
import { useAuthStore } from './authStore';
import { authApi } from '../api/auth.api';

// Mock del cliente de API: aísla el store de axios/import.meta/notistack.
vi.mock('../api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  },
}));

const STORAGE_KEY = 'auth-storage';

function makeUser(): User {
  return {
    id: 'user-1',
    username: 'tester',
    email: 't@example.com',
    roleId: 'role-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function refreshResponse(over: Partial<AuthResponse> = {}): AuthResponse {
  return {
    accessToken: 'access-2',
    refreshToken: 'refresh-2',
    user: makeUser(),
    ...over,
  };
}

/** Deja el store en sesión autenticada (persist sincroniza localStorage). */
function authenticate(over: Partial<ReturnType<typeof useAuthStore.getState>> = {}) {
  useAuthStore.setState({
    user: makeUser(),
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    permissions: ['p'],
    isAuthenticated: true,
    ...over,
  });
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const store = () => useAuthStore.getState();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authApi.me).mockResolvedValue({ user: makeUser(), permissions: ['p'] });
  vi.mocked(authApi.logout).mockResolvedValue(undefined);
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    permissions: [],
    isAuthenticated: false,
    mustChangePassword: false,
    isLoading: false,
    error: null,
  });
  localStorage.clear();
});

describe('authStore.refreshAccessToken — single-flight', () => {
  it('varias llamadas concurrentes comparten un único refresh', async () => {
    const d = deferred<AuthResponse>();
    vi.mocked(authApi.refresh).mockReturnValue(d.promise);
    authenticate();

    const p1 = store().refreshAccessToken();
    const p2 = store().refreshAccessToken();
    const p3 = store().refreshAccessToken();

    d.resolve(refreshResponse());
    await Promise.all([p1, p2, p3]);

    // Es el fix de raíz: N 401 concurrentes → una sola rotación de token.
    expect(authApi.refresh).toHaveBeenCalledTimes(1);
    expect(store().accessToken).toBe('access-2');
    expect(store().refreshToken).toBe('refresh-2');
  });

  it('libera el candado para permitir un refresh posterior', async () => {
    vi.mocked(authApi.refresh)
      .mockResolvedValueOnce(refreshResponse({ accessToken: 'a2', refreshToken: 'r2' }))
      .mockResolvedValueOnce(refreshResponse({ accessToken: 'a3', refreshToken: 'r3' }));
    authenticate();

    await store().refreshAccessToken();
    await store().refreshAccessToken();

    expect(authApi.refresh).toHaveBeenCalledTimes(2);
    expect(store().accessToken).toBe('a3');
  });
});

describe('authStore.refreshAccessToken — re-hidratación multipestaña', () => {
  it('adopta el token que otra pestaña ya rotó, sin refrescar por red', async () => {
    authenticate(); // in-memory + localStorage = refresh-1
    // Otra pestaña rotó el token en localStorage.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: { accessToken: 'access-otra', refreshToken: 'refresh-otra' },
        version: 0,
      }),
    );

    await store().refreshAccessToken();

    expect(authApi.refresh).not.toHaveBeenCalled();
    expect(store().accessToken).toBe('access-otra');
    expect(store().refreshToken).toBe('refresh-otra');
  });
});

describe('authStore.refreshAccessToken — Web Locks', () => {
  afterEach(() => {
    // Restaurar navigator sin el stub de locks.
    delete (navigator as unknown as { locks?: unknown }).locks;
  });

  it('serializa el refresh con navigator.locks cuando está disponible', async () => {
    const request = vi.fn((_name: string, cb: () => Promise<void>) => Promise.resolve().then(cb));
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });

    vi.mocked(authApi.refresh).mockResolvedValue(refreshResponse());
    authenticate();

    await store().refreshAccessToken();

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('auth-refresh', expect.any(Function));
  });
});

describe('authStore.refreshAccessToken — guard anti-resurrección', () => {
  it('NO restaura la sesión si el logout ocurre durante el refresh', async () => {
    const d = deferred<AuthResponse>();
    vi.mocked(authApi.refresh).mockReturnValue(d.promise);
    authenticate();

    const pending = store().refreshAccessToken(); // suspende en authApi.refresh
    await store().logout(); // isAuthenticated -> false, limpia storage
    d.resolve(refreshResponse()); // el refresh resuelve DESPUÉS del logout
    await pending;

    expect(store().isAuthenticated).toBe(false);
    expect(store().accessToken).toBeNull();
    expect(store().user).toBeNull();
  });

  it('si el refresh falla, cierra sesión', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('Invalid refresh token'));
    authenticate();

    await expect(store().refreshAccessToken()).rejects.toThrow('Invalid refresh token');

    expect(store().isAuthenticated).toBe(false);
    expect(store().accessToken).toBeNull();
    expect(authApi.logout).toHaveBeenCalledTimes(1);
  });
});

describe('authStore — sincronización entre pestañas (evento storage)', () => {
  it('adopta el token nuevo cuando otra pestaña lo rota', () => {
    authenticate(); // refresh-1
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: { accessToken: 'access-sync', refreshToken: 'refresh-sync' },
        version: 0,
      }),
    );

    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));

    expect(store().refreshToken).toBe('refresh-sync');
    expect(store().accessToken).toBe('access-sync');
    expect(store().isAuthenticated).toBe(true);
  });

  it('propaga el logout cuando otra pestaña cierra sesión', () => {
    authenticate();
    localStorage.removeItem(STORAGE_KEY); // otra pestaña cerró sesión

    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));

    expect(store().isAuthenticated).toBe(false);
    expect(store().accessToken).toBeNull();
  });

  it('ignora eventos de otras claves de localStorage', () => {
    authenticate();

    window.dispatchEvent(new StorageEvent('storage', { key: 'otra-cosa' }));

    expect(store().isAuthenticated).toBe(true);
    expect(store().refreshToken).toBe('refresh-1');
  });
});
