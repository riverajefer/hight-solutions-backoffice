import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginDto, AuthResponse } from '../types';
import { authApi } from '../api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Acciones
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
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
      isLoading: false,
      error: null,

      login: async (credentials: LoginDto) => {
        set({ isLoading: true, error: null });
        try {
          const response: AuthResponse = await authApi.login(credentials);
          
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            permissions: response.permissions || [],
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
          set({
            error: message,
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          permissions: [],
          isAuthenticated: false,
          error: null,
        });
        localStorage.removeItem('auth-storage');
      },

      refreshAccessToken: async () => {
        const { user, refreshToken } = get();
        
        if (!user || !refreshToken) {
          get().logout();
          return;
        }

        try {
          const response: AuthResponse = await authApi.refresh(user.id, refreshToken);
          set({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
          });
          
          // Recargar permisos después de refrescar el token
          try {
            const profileData = await authApi.me();
            set({
              permissions: profileData.permissions || [],
            });
          } catch (permError) {
            console.error('Error loading user permissions:', permError);
          }
        } catch (error: unknown) {
          get().logout();
          throw error;
        }
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
      }),
    }
  )
);
