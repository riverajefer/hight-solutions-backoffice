import React, { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Collapse,
  useTheme,
  alpha,
} from '@mui/material';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { attendanceApi } from '../../api';
import { ATTENDANCE_STATUS_QUERY_KEY } from '../../features/attendance/hooks/useAttendance';
import { useAuthStore } from '../../store/authStore';
import { PERMISSIONS } from '../../utils/constants';

/**
 * Banner recordatorio que aparece cuando el usuario está usando la aplicación
 * pero NO ha marcado su entrada de asistencia.
 *
 * Contexto: la asistencia es manual (botón "Marcar Entrada"). Es posible estar
 * trabajando/activo en la app sin haber marcado entrada, lo que genera registros
 * con hora de entrada posterior a la hora real de inicio. Este banner recuerda
 * marcar entrada al iniciar la jornada.
 *
 * Se oculta automáticamente al marcar entrada y puede descartarse por sesión.
 */
export const AttendanceReminderBanner: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const canUseAttendance = hasPermission(PERMISSIONS.USE_ATTENDANCE);

  // Descartado solo para la sesión actual (reaparece al recargar/nuevo login)
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('attendanceReminderDismissed') === 'true',
  );

  const { data: status, isLoading } = useQuery({
    queryKey: ATTENDANCE_STATUS_QUERY_KEY,
    queryFn: () => attendanceApi.getMyStatus(),
    refetchInterval: 60000,
    enabled: canUseAttendance,
  });

  const getDeviceInfo = () => ({
    userAgent: navigator.userAgent,
    platform:
      navigator.platform ||
      (navigator as any).userAgentData?.platform ||
      'Unknown',
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const getGeolocation = (): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60000 },
      );
    });

  const clockInMutation = useMutation({
    mutationFn: (dto: any) => attendanceApi.clockIn(dto),
    onSuccess: () => {
      enqueueSnackbar('Entrada registrada exitosamente', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_STATUS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'my-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'my-summary'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Error al marcar entrada';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });

  const handleClockIn = async () => {
    try {
      const location = await getGeolocation();
      const metadata = {
        device: getDeviceInfo(),
        ...(location && { location }),
      };
      clockInMutation.mutate({ metadata });
    } catch {
      clockInMutation.mutate({});
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('attendanceReminderDismissed', 'true');
    setDismissed(true);
  };

  // No mostrar si: sin permiso, cargando, descartado, o ya tiene entrada activa
  const shouldShow =
    canUseAttendance && !isLoading && !dismissed && status?.active === false;

  return (
    <Collapse in={shouldShow} unmountOnExit>
      <Alert
        severity="warning"
        variant="outlined"
        onClose={handleDismiss}
        icon={<PlayCircleIcon />}
        sx={{
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          backgroundColor: isDark
            ? alpha(theme.palette.warning.main, 0.12)
            : alpha(theme.palette.warning.main, 0.08),
          alignItems: 'center',
          '& .MuiAlert-message': {
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          },
        }}
        action={
          <Button
            color="warning"
            size="small"
            variant="contained"
            startIcon={
              clockInMutation.isPending ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <PlayCircleIcon />
              )
            }
            disabled={clockInMutation.isPending}
            onClick={handleClockIn}
            sx={{ whiteSpace: 'nowrap', mr: 1 }}
          >
            Marcar Entrada
          </Button>
        }
      >
        No has marcado tu entrada de asistencia. Recuerda marcarla al iniciar tu
        jornada para que tus horas queden registradas correctamente.
      </Alert>
    </Collapse>
  );
};
