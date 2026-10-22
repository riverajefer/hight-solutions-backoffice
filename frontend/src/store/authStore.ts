import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  LoginDto,
  AuthResponse,
  LoginResponse,
  LoginSession,
  PendingTwoFactor,
  TwoFactorEnrollment,
} from '../types';
import { authApi } from '../api/auth.api';
import { twoFactorApi } from '../api/two-factor.api';
import { getTrustedDeviceToken, saveTrustedDeviceToken } from '../utils/trustedDevice';

/**
 * Promesa de refresh en vuelo (single-flight).
 *
 * El backend ROTA el refresh token en cada refresh (solo hay uno válido por
 * usuario). Si varios requests reciben 401 a la vez y cada uno dispara su
 * propio refresh, el primero invalida el token que usarán los demás → esos
 * refresh fallan → logout involuntario.
 *
 * Al compartir una única promesa, todos los llamadores concurrentes esperan
 * al MISMO refresh y reutilizan el token nuevo, eliminando la carrera.
 */
let refreshInFlight: Promise<void> | null = null;

/** Clave de persistencia de Zustand (debe coincidir con `name` del persist). */
const AUTH_STORAGE_KEY = 'auth-storage';

/** Nombre del lock de Web Locks que serializa el refresh entre pestañas. */
const REFRESH_LOCK_NAME = 'auth-refresh';

/**
 * Lee el token persistido en localStorage (fuente compartida entre pestañas
 * del mismo navegador). Se usa para detectar si OTRA pestaña ya rotó el token
 * y así evitar un refresh redundante que invalidaría el token recién emitido.
 */
function readPersistedAuth(): {
  accessToken: string | null;
  refreshToken: string | null;
} | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw)?.state;
    if (!state) return null;
    return {
      accessToken: state.accessToken ?? null,
      refreshToken: state.refreshToken ?? null,
    };
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  isLoading: boolean;
  error: string | null;
  /** Segundo paso del doble factor en curso. Solo en memoria: recargar vuelve al login. */
  pendingTwoFactor: PendingTwoFactor | null;

  // Acciones
  /** Devuelve qué pasó: `OK` (hay sesión) o el paso del doble factor que falta. */
  login: (credentials: LoginDto) => Promise<LoginResponse['status']>;
  verifyTwoFactor: (code: string, rememberDevice: boolean) => Promise<void>;
  startTwoFactorEnrollment: () => Promise<TwoFactorEnrollment>;
  /**
   * Confirma el registro y devuelve la sesión SIN aplicarla: antes de entrar,
   * el usuario tiene que guardar sus códigos de respaldo. Luego `completeLogin`.
   */
  confirmTwoFactorEnrollment: (code: string, rememberDevice: boolean) => Promise<LoginSession>;
  completeLogin: (session: LoginSession) => void;
  cancelTwoFactor: () => void;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  clearMustChangePassword: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      permissions: [],
      isAuthenticated: false,
      mustChangePassword: false,
      isLoading: false,
      error: null,
      pendingTwoFactor: null,

      login: async (credentials: LoginDto) => {
        set({ isLoading: true, error: null, pendingTwoFactor: null });
        try {
          const response = await authApi.login({
            ...credentials,
            deviceToken: getTrustedDeviceToken(credentials.username),
          });

          if (response.status === '2FA_REQUIRED') {
            set({
              pendingTwoFactor: {
                kind: 'challenge',
                token: response.challengeToken,
                username: credentials.username,
              },
              isLoading: false,
            });
          } else if (response.status === '2FA_SETUP_REQUIRED') {
            set({
              pendingTwoFactor: {
                kind: 'setup',
                token: response.setupToken,
                username: credentials.username,
              },
              isLoading: false,
            });
          } else {
            get().completeLogin(response);
          }
          return response.status;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
          set({
            error: message,
            isLoading: false,
          });
          throw error;
        }
      },

      verifyTwoFactor: async (code: string, rememberDevice: boolean) => {
        const pending = get().pendingTwoFactor;
        if (pending?.kind !== 'challenge') {
          throw new Error('La verificación venció. Inicia sesión de nuevo.');
        }
        const session = await twoFactorApi.verifyLogin({
          challengeToken: pending.token,
          code,
          rememberDevice,
        });
        get().completeLogin(session);
      },

      startTwoFactorEnrollment: async () => {
        const pending = get().pendingTwoFactor;
        if (pending?.kind !== 'setup') {
          throw new Error('La verificación venció. Inicia sesión de nuevo.');
        }
        return twoFactorApi.startLoginEnrollment(pending.token);
      },

      confirmTwoFactorEnrollment: async (code: string, rememberDevice: boolean) => {
        const pending = get().pendingTwoFactor;
        if (pending?.kind !== 'setup') {
          throw new Error('La verificación venció. Inicia sesión de nuevo.');
        }
        return twoFactorApi.confirmLoginEnrollment({
          setupToken: pending.token,
          code,
          rememberDevice,
        });
      },

      completeLogin: (session: LoginSession) => {
        if (session.deviceToken && session.deviceTokenExpiresAt && session.user.username) {
          saveTrustedDeviceToken(session.user.username, session.deviceToken, session.deviceTokenExpiresAt);
        }
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          permissions: session.permissions || [],
          isAuthenticated: true,
          mustChangePassword: session.user.mustChangePassword ?? false,
          pendingTwoFactor: null,
          isLoading: false,
        });
      },

      cancelTwoFactor: () => {
        set({ pendingTwoFactor: null, error: null });
      },

      logout: async () => {
        const { accessToken } = get();

        // Limpiar estado local PRIMERO para evitar loops de 401
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          permissions: [],
          isAuthenticated: false,
          mustChangePassword: false,
          pendingTwoFactor: null,
          error: null,
        });
        localStorage.removeItem('auth-storage');

        // Intentar logout en backend con el token guardado explícitamente
        if (accessToken) {
          try {
            await authApi.logout(accessToken);
          } catch (error) {
            console.error('Error logging out from backend:', error);
          }
        }
      },

      refreshAccessToken: async () => {
        // Single-flight INTRA-pestaña: si ya hay un refresh en curso en esta
        // pestaña, reutilizar esa misma promesa (evita disparar otro con un
        // token ya rotado).
        if (refreshInFlight) {
          return refreshInFlight;
        }

        // Refresh real. Se ejecuta dentro del lock de Web Locks para que solo
        // UNA pestaña del navegador refresque a la vez.
        const performRefresh = async (): Promise<void> => {
          // Al obtener el lock, otra pestaña pudo haber refrescado ya. Re-hidratar
          // el token más reciente de localStorage: si difiere del nuestro, esa
          // pestaña ya rotó el token → lo adoptamos y NO refrescamos de nuevo.
          const persisted = readPersistedAuth();
          if (
            persisted?.refreshToken &&
            persisted.refreshToken !== get().refreshToken
          ) {
            set({
              accessToken: persisted.accessToken,
              refreshToken: persisted.refreshToken,
            });
            return;
          }

          const { user, refreshToken } = get();

          if (!user || !refreshToken) {
            await get().logout();
            throw new Error('No hay refresh token disponible');
          }

          try {
            const response: AuthResponse = await authApi.refresh(user.id, refreshToken);

            // Guard anti-resurrección: si el usuario cerró sesión mientras el
            // refresh estaba en vuelo, NO restaurar tokens ni sesión.
            if (!get().isAuthenticated) {
              return;
            }

            set({
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
              user: response.user,
              mustChangePassword: response.user?.mustChangePassword ?? get().mustChangePassword,
            });

            // Recargar permisos después de refrescar el token
            try {
              const profileData = await authApi.me();
              // Mismo guard: pudo cerrar sesión durante la carga de permisos.
              if (!get().isAuthenticated) {
                return;
              }
              set({
                permissions: profileData.permissions || [],
              });
            } catch (permError) {
              console.error('Error loading user permissions:', permError);
            }
          } catch (error: unknown) {
            await get().logout();
            throw error;
          }
        };

        // Web Locks serializa el refresh ENTRE pestañas del mismo navegador
        // (comparten localStorage y por tanto el refresh token). Con fallback
        // si el navegador no soporta la API.
        const runWithCrossTabLock = async (): Promise<void> => {
          if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks) {
            await navigator.locks.request(REFRESH_LOCK_NAME, performRefresh);
            return;
          }
          await performRefresh();
        };

        refreshInFlight = runWithCrossTabLock();

        try {
          await refreshInFlight;
        } finally {
          // Liberar el candado una vez resuelto (con éxito o error) para
          // permitir un refresh posterior cuando el nuevo token vuelva a expirar.
          refreshInFlight = null;
        }
      },

      clearMustChangePassword: () => {
        set((state) => ({
          mustChangePassword: false,
          user: state.user ? { ...state.user, mustChangePassword: false } : null,
        }));
      },

      hasPermission: (permission: string) => {
        return get().permissions.includes(permission);
      },

      hasAnyPermission: (permissions: string[]) => {
        const userPermissions = get().permissions;
        return permissions.some((p) => userPermissions.includes(p));
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        mustChangePassword: state.mustChangePassword,
      }),
    }
  )
);

/**
 * Sincronización entre pestañas del mismo navegador.
 *
 * El evento `storage` se dispara SOLO en las OTRAS pestañas cuando una cambia
 * `localStorage`. Lo usamos para:
 *  - Adoptar en caliente el token que otra pestaña acaba de rotar (evita que
 *    esta pestaña haga su propio refresh y provoque la carrera de rotación).
 *  - Propagar el logout: si una pestaña cierra sesión, las demás también.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== AUTH_STORAGE_KEY) return;

    const state = useAuthStore.getState();
    // Solo sincronizamos sesiones ya activas en esta pestaña.
    if (!state.isAuthenticated) return;

    const persisted = readPersistedAuth();

    // Otra pestaña cerró sesión (se eliminó/limpió el storage) → cerrar aquí.
    if (!persisted?.refreshToken) {
      useAuthStore.setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        permissions: [],
        isAuthenticated: false,
        mustChangePassword: false,
      });
      return;
    }

    // Otra pestaña rotó el token → adoptarlo sin refrescar.
    if (persisted.refreshToken !== state.refreshToken) {
      useAuthStore.setState({
        accessToken: persisted.accessToken,
        refreshToken: persisted.refreshToken,
      });
    }
  });
}
