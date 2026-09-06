import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { getFriendlyErrorMessage } from '../utils/error-messages';
import { useMaintenanceModeStore } from '../hooks/useMaintenanceMode';
import { enqueueSnackbar } from 'notistack';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/**
 * Crea una instancia de Axios configurada con interceptores
 * para manejo de autenticación y refresh token
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de solicitud: agrega el token de acceso
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore.getState();
    const token = authStore.accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta: maneja 503 (mantenimiento), 401, refresh token y errores
axiosInstance.interceptors.response.use(
  (response) => {
    // Si estábamos en modo mantenimiento y el servidor respondió OK, desactivarlo
    const { isMaintenanceMode, deactivateMaintenance } =
      useMaintenanceModeStore.getState();
    if (isMaintenanceMode) {
      deactivateMaintenance();
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Manejo de Modo Mantenimiento — 503 Service Unavailable
    if (error.response?.status === 503) {
      const data = error.response.data as Record<string, unknown>;
      const message =
        (data?.message as string) ||
        'El sistema se encuentra en mantenimiento. Por favor intenta más tarde.';
      useMaintenanceModeStore.getState().activateMaintenance(message);
      return Promise.reject(error);
    }

    // Manejo de Modo "Missing Permissions" — 403 Forbidden
    if (error.response?.status === 403) {
      const data = error.response.data as any;
      const backendMessage = data?.message || 'No tienes permisos para realizar esta acción.';
      
      enqueueSnackbar(backendMessage, { variant: 'error' });
      
      return Promise.reject(error);
    }

    // Manejo de Refresh Token - No reintentar para endpoints de auth
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                          originalRequest.url?.includes('/auth/register') || 
                          originalRequest.url?.includes('/auth/refresh') ||
                          originalRequest.url?.includes('/auth/logout');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // refreshAccessToken() es single-flight: si varios requests reciben 401
        // a la vez, todos esperan al MISMO refresh y reutilizan el token nuevo,
        // evitando invalidarse entre sí por la rotación del refresh token.
        const authStore = useAuthStore.getState();
        await authStore.refreshAccessToken();

        // Reintentar la solicitud original con el token ya refrescado
        const newToken = useAuthStore.getState().accessToken;
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // El store ya ejecutó logout() al fallar el refresh; solo propagamos.
        return Promise.reject(refreshError);
      }
    }

    // Estandarización de mensajes de error
    const data = error.response?.data as any;
    const backendMessage = data?.message || error.message;
    
    if (error.response) {
      // Si hay respuesta del servidor, intentar obtener un mensaje amigable
      error.message = getFriendlyErrorMessage(backendMessage);
    } else if (error.code === 'ERR_NETWORK') {
      error.message = 'No se pudo conectar con el servidor';
    } else if (error.message === 'Network Error') {
      error.message = 'Error de red';
    }

    return Promise.reject(error);
  }
);

// ─── Doble envío: una sola petición en vuelo por acción ───────────────────────
//
// Un doble clic dispara dos veces el mismo handler antes de que React vuelva a
// renderizar, así que `disabled={mutation.isPending}` no alcanza a bloquear el
// segundo. En producción eso creó dos órdenes de gasto idénticas con 34 ms de
// diferencia (OG-2026-0485 y 0486), y antes solicitudes de aprobación duplicadas
// que mandaron dos WhatsApp.
//
// Aquí se cierra en el único punto por el que pasan todas las peticiones: si ya
// hay una petición que muta con el mismo método, la misma URL y el mismo cuerpo
// EN VUELO, la segunda no se envía — se le entrega la promesa de la primera. La
// ventana dura lo que dura la petición, así que repetir la misma acción a
// propósito (después de ver el resultado) sigue funcionando igual que siempre.
//
// Esto es una red de seguridad transversal, no un reemplazo de la idempotencia
// del servidor: lo que llega de dos pestañas, dos dispositivos o un reintento
// posterior solo lo puede resolver el backend.

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Los cuerpos que no se pueden comparar de forma fiable quedan fuera: `FormData`
 * serializa igual para archivos distintos, y dos subidas en paralelo son un uso
 * legítimo, no un doble clic.
 */
const isDedupable = (data: unknown): boolean => {
  if (data === undefined || data === null) return true;
  if (typeof FormData !== 'undefined' && data instanceof FormData) return false;
  if (typeof Blob !== 'undefined' && data instanceof Blob) return false;
  return true;
};

const buildKey = (method: string, url: string, data: unknown): string | null => {
  try {
    return `${method} ${url} ${JSON.stringify(data ?? null)}`;
  } catch {
    // Cuerpo no serializable (referencias circulares): no se deduplica.
    return null;
  }
};

const singleFlight = <T>(
  method: string,
  url: string,
  data: unknown,
  send: () => Promise<T>,
): Promise<T> => {
  if (!isDedupable(data)) return send();

  const key = buildKey(method, url, data);
  if (!key) return send();

  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  // La entrada se limpia al terminar (bien o mal), de modo que un reintento tras
  // un error vuelve a salir a la red con normalidad.
  const promise = send().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise as Promise<unknown>);
  return promise;
};

// Se envuelven solo los métodos que cambian estado. Los GET no se tocan: de esos
// se encarga React Query, que ya deduplica por `queryKey`.
const rawPost = axiosInstance.post.bind(axiosInstance);
const rawPut = axiosInstance.put.bind(axiosInstance);
const rawPatch = axiosInstance.patch.bind(axiosInstance);
const rawDelete = axiosInstance.delete.bind(axiosInstance);

axiosInstance.post = ((url: string, data?: unknown, config?: unknown) =>
  singleFlight('POST', url, data, () =>
    rawPost(url, data, config as never),
  )) as typeof axiosInstance.post;

axiosInstance.put = ((url: string, data?: unknown, config?: unknown) =>
  singleFlight('PUT', url, data, () =>
    rawPut(url, data, config as never),
  )) as typeof axiosInstance.put;

axiosInstance.patch = ((url: string, data?: unknown, config?: unknown) =>
  singleFlight('PATCH', url, data, () =>
    rawPatch(url, data, config as never),
  )) as typeof axiosInstance.patch;

// DELETE lleva el identificador en la URL, así que la clave se arma sin cuerpo.
axiosInstance.delete = ((url: string, config?: unknown) =>
  singleFlight('DELETE', url, undefined, () =>
    rawDelete(url, config as never),
  )) as typeof axiosInstance.delete;

export default axiosInstance;
