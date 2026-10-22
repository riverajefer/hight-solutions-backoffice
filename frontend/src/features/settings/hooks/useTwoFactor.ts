import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { twoFactorApi } from '../../../api';

const STATUS_KEY = ['two-factor', 'status'];
const DEVICES_KEY = ['two-factor', 'trusted-devices'];

/** Estado del doble factor del usuario y sus equipos de confianza. */
export const useTwoFactor = () => {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => twoFactorApi.getStatus(),
  });

  const devicesQuery = useQuery({
    queryKey: DEVICES_KEY,
    queryFn: () => twoFactorApi.getTrustedDevices(),
    enabled: !!statusQuery.data?.enabled && statusQuery.data.enforcement !== 'off',
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const disableMutation = useMutation({
    mutationFn: (data: { password: string; code: string }) => twoFactorApi.disable(data),
    onSuccess: refresh,
  });

  const regenerateMutation = useMutation({
    mutationFn: (code: string) => twoFactorApi.regenerateBackupCodes(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  });

  const revokeDeviceMutation = useMutation({
    mutationFn: (id: string) => twoFactorApi.revokeTrustedDevice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEVICES_KEY }),
  });

  return {
    statusQuery,
    devicesQuery,
    refresh,
    disableMutation,
    regenerateMutation,
    revokeDeviceMutation,
  };
};
