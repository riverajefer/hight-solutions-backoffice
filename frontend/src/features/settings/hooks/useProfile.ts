import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../../api';
import { UpdateProfilePhotoDto } from '../../../types';

export const useProfile = () => {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile(),
  });

  const updateProfilePhotoMutation = useMutation({
    mutationFn: (data: UpdateProfilePhotoDto) => authApi.updateProfilePhoto(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return {
    profileQuery,
    updateProfilePhotoMutation,
  };
};
