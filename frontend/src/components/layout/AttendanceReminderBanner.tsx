import React, { useState } from 'react';
import {
  Alert,
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
import { LoadingButton } from '../../components/common/LoadingButton';

/** Hora de Colombia en formato corto, p. ej. "7:00 p. m.". */
const formatBusinessTime = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  }).format(new Date(iso));

/**
 * Banner recordatorio que aparece cuando el usuario está usando la aplicación
 * pero NO tiene una entrada de asistencia activa.
 *
 * Contexto: la asistencia es manual (botón "Marcar Entrada"). Es posible estar
 * trabajando/activo en la app sin haber marcado entrada, lo que genera registros
 * con hora de entrada posterior a la hora real de inicio. Este banner recuerda
 * marcar entrada al iniciar la jornada.
 *
 * Ojo: el `onClose` del recordatorio normal no pinta ninguna X. MUI solo muestra
 * el botón de cerrar cuando el Alert no tiene `action`, y aquí siempre lleva
 * "Marcar Entrada". El descarte por sesión solo aplica si la marca ya existe en
 * `sessionStorage`.
 *
 * Si el sistema le cerró la jornada hoy (`autoClosedAt`), el aviso cambia e ignora
 * esa marca: las horas extra se registran marcando entrada de nuevo.
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

  const inactive = canUseAttendance && !isLoading && status?.active === false;
  const autoClosedAt = inactive ? status?.autoClosedAt ?? null : null;

  // Sin permiso, cargando o con entrada activa no se muestra. El aviso de jornada
  // cerrada por el sistema ignora el descarte; el recordatorio normal no.
  const shouldShow = inactive && (Boolean(autoClosedAt) || !dismissed);

  return (
    <Collapse in={shouldShow} unmountOnExit>
      <Alert
        severity={autoClosedAt ? 'info' : 'warning'}
        variant="outlined"
        onClose={autoClosedAt ? undefined : handleDismiss}
        icon={<PlayCircleIcon fontSize="small" />}
        sx={{
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          backgroundColor: isDark
            ? alpha(theme.palette[autoClosedAt ? 'info' : 'warning'].main, 0.12)
            : alpha(theme.palette[autoClosedAt ? 'info' : 'warning'].main, 0.08),
          alignItems: 'center',
          py: 0.25,
          px: 2,
          fontSize: '0.8125rem',
          // En mobile permitimos que el botón (action) baje a una segunda
          // línea a ancho completo; en sm+ queda alineado a la derecha.
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          '& .MuiAlert-icon': {
            py: 0,
            mr: 1,
            fontSize: '1.125rem',
          },
          '& .MuiAlert-message': {
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            minWidth: 0,
            py: 0.5,
          },
          '& .MuiAlert-action': {
            pt: 0,
            pl: { xs: 0, sm: 2 },
            ml: { xs: 0, sm: 'auto' },
            mr: { xs: 0, sm: -0.5 },
            mt: { xs: 1, sm: 0 },
            width: { xs: '100%', sm: 'auto' },
          },
        }}
        action={
          <LoadingButton
            loading={clockInMutation.isPending}
            color={autoClosedAt ? 'info' : 'warning'}
            size="small"
            variant="contained"
            startIcon={<PlayCircleIcon sx={{ fontSize: 16 }} />}
            onClick={handleClockIn}
            sx={{
              whiteSpace: 'nowrap',
              width: { xs: '100%', sm: 'auto' },
              py: 0.25,
              px: 1.25,
              fontSize: '0.75rem',
            }}
          >
            Marcar Entrada
          </LoadingButton>
        }
      >
        {autoClosedAt
          ? `Tu jornada se cerró automáticamente a las ${formatBusinessTime(autoClosedAt)}. Si vas a hacer horas extra, marca entrada de nuevo.`
          : 'No has marcado tu entrada de asistencia. Recuerda marcarla al iniciar tu jornada para que tus horas queden registradas correctamente.'}
      </Alert>
    </Collapse>
  );
};
