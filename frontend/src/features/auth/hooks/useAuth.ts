import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { LoginDto } from '../../../types';

/**
 * Hook personalizado para autenticación
 */
export const useAuth = () => {
  const { user, accessToken, isAuthenticated, logout } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginDto) => useAuthStore.getState().login(credentials),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await logout();
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
