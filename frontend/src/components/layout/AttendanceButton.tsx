import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { attendanceApi } from '../../api';
import { ATTENDANCE_STATUS_QUERY_KEY } from '../../features/attendance/hooks/useAttendance';
import { neonColors, neonAccents } from '../../theme';

/**
 * Formatea la diferencia de tiempo desde clockIn en "HH:MM:SS"
 */
const formatElapsed = (clockInIso: string): string => {
  const diffMs = Date.now() - new Date(clockInIso).getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
};

export const AttendanceButton: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [elapsed, setElapsed] = useState('');
  const [isGatheringLocation, setIsGatheringLocation] = useState(false);

  // Estado de asistencia actual
  const { data: status, isLoading } = useQuery({
    queryKey: ATTENDANCE_STATUS_QUERY_KEY,
    queryFn: () => attendanceApi.getMyStatus(),
    refetchInterval: 60000,
  });

  // Timer para mostrar tiempo transcurrido
  useEffect(() => {
    if (!status?.active || !status.record?.clockIn) {
      setElapsed('');
      return;
    }

    const update = () => setElapsed(formatElapsed(status.record!.clockIn));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [status?.active, status?.record?.clockIn]);

  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform || (navigator as any).userAgentData?.platform || 'Unknown',
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  };

  const getGeolocation = (): Promise<{ latitude: number; longitude: number; accuracy: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => {
          // Si el usuario no acepta o hay error, resolvemos null para continuar normalmente
          resolve(null);
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  };

  // Mutation: clock-in
  const clockInMutation = useMutation({
    mutationFn: (dto: any) => attendanceApi.clockIn(dto),
    onSuccess: () => {
      enqueueSnackbar('Entrada registrada exitosamente', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_STATUS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'records'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Error al marcar entrada';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });

  // Mutation: clock-out
  const clockOutMutation = useMutation({
    mutationFn: (n: string) => attendanceApi.clockOut({ notes: n || undefined }),
    onSuccess: () => {
      enqueueSnackbar('Salida registrada exitosamente', { variant: 'success' });
      setClockOutOpen(false);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_STATUS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'records'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Error al marcar salida';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });

  const handleClockIn = async () => {
    setIsGatheringLocation(true);
    try {
      // Recopilar info de dispositivo
      const deviceInfo = getDeviceInfo();
      
      // Intentar obtener ubicación (si no acepta, retorna null y continúa)
      const location = await getGeolocation();

      const metadata = {
        device: deviceInfo,
        ...(location && { location }),
      };

      clockInMutation.mutate({ metadata }, {
        onSettled: () => setIsGatheringLocation(false),
      });
    } catch (e) {
      setIsGatheringLocation(false);
      clockInMutation.mutate({}); // Continuar sin metadata en caso de error extremo
    }
  };

  const handleOpenClockOut = () => {
    setNotes('');
    setClockOutOpen(true);
  };

  const handleConfirmClockOut = () => {
    clockOutMutation.mutate(notes);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
        <CircularProgress size={20} sx={{ color: 'white' }} />
      </Box>
    );
  }

  const isActive = status?.active ?? false;
  const isWorking = clockInMutation.isPending || clockOutMutation.isPending || isGatheringLocation;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Timer chip cuando hay entrada activa */}
        {isActive && elapsed && (
          <Tooltip title="Tiempo trabajado hoy">
            <Chip
              icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
              label={elapsed}
              size="small"
              sx={{
                backgroundColor: isDark
                  ? alpha(neonColors.primary.main, 0.15)
                  : alpha(theme.palette.success.main, 0.1),
                color: isDark ? neonColors.primary.light : theme.palette.success.dark,
                border: `1px solid ${isDark
                  ? alpha(neonColors.primary.main, 0.4)
                  : alpha(theme.palette.success.main, 0.4)}`,
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                fontWeight: 600,
                '& .MuiChip-icon': {
                  color: 'inherit',
                },
              }}
            />
          </Tooltip>
        )}

        {/* Botón principal de marcaje */}
        {!isActive ? (
          <Tooltip title="Marcar entrada de asistencia">
            <Button
              variant="outlined"
              size="small"
              startIcon={isWorking ? <CircularProgress size={14} color="inherit" /> : <PlayCircleIcon />}
              onClick={handleClockIn}
              disabled={isWorking}
              sx={{
                borderColor: isDark
                  ? alpha(theme.palette.success.main, 0.6)
                  : alpha(theme.palette.success.main, 0.5),
                color: isDark ? theme.palette.success.light : theme.palette.success.dark,
                backgroundColor: alpha(theme.palette.success.main, 0.08),
                fontSize: '0.75rem',
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.success.main, 0.18),
                  borderColor: theme.palette.success.main,
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Marcar Entrada
            </Button>
          </Tooltip>
        ) : (
          <Tooltip title="Marcar salida de asistencia">
            <Button
              variant="outlined"
              size="small"
              startIcon={isWorking ? <CircularProgress size={14} color="inherit" /> : <StopCircleIcon />}
              onClick={handleOpenClockOut}
              disabled={isWorking}
              sx={{
                borderColor: isDark
                  ? alpha(neonAccents.neonMagenta, 0.6)
                  : alpha(theme.palette.error.main, 0.5),
                color: isDark ? neonAccents.neonMagenta : theme.palette.error.main,
                backgroundColor: alpha(theme.palette.error.main, 0.08),
                fontSize: '0.75rem',
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.18),
                  borderColor: isDark ? neonAccents.neonMagenta : theme.palette.error.main,
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Marcar Salida
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Dialog para agregar nota al marcar salida */}
      <Dialog
        open={clockOutOpen}
        onClose={() => !clockOutMutation.isPending && setClockOutOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: isDark
              ? 'linear-gradient(135deg, #0d1b2a 0%, #1a1040 100%)'
              : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Confirmar Salida
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Nota (opcional)"
            placeholder="Ej: Salida a almuerzo, fin de jornada..."
            fullWidth
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            inputProps={{ maxLength: 500 }}
            sx={{ mt: 1 }}
            helperText={`${notes.length}/500`}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setClockOutOpen(false)}
            disabled={clockOutMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmClockOut}
            disabled={clockOutMutation.isPending}
            startIcon={
              clockOutMutation.isPending
                ? <CircularProgress size={14} color="inherit" />
                : <StopCircleIcon />
            }
          >
            Confirmar Salida
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
