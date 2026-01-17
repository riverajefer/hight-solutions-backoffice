import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi } from '../../../api/auth.api';
import { useAuthStore } from '../../../store/authStore';
import { LoginDto } from '../../../types';

/**
 * Hook personalizado para autenticación
 */
export const useAuth = () => {
  const { user, accessToken, isAuthenticated, login, logout } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginDto) => useAuthStore.getState().login(credentials),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch (error) {
        console.error('Error logging out:', error);
      } finally {
        logout();
      }
    },
  });

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading: loginMutation.isPending || logoutMutation.isPending,
    loginMutation,
    logoutMutation,
  };
};
