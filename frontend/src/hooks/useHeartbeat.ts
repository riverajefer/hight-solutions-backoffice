import { useEffect } from 'react';
import { attendanceApi } from '../api';
import { useAuthStore } from '../store/authStore';
import { PERMISSIONS } from '../utils/constants';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Hook que envía heartbeats de actividad al servidor cada 5 minutos
 * mientras la pestaña está activa. Solo funciona si el usuario
 * tiene el permiso 'use_attendance'.
 */
export const useHeartbeat = () => {
  const { hasPermission } = useAuthStore();

  useEffect(() => {
    // Solo enviar heartbeats si el usuario tiene permiso de asistencia
    if (!hasPermission(PERMISSIONS.USE_ATTENDANCE)) return;

    const sendHeartbeat = async () => {
      // Solo enviar si la pestaña está activa
      if (document.visibilityState !== 'visible') return;
      try {
        await attendanceApi.heartbeat();
      } catch {
        // Silenciar errores — los heartbeats son opcionales
      }
    };

    // Enviar uno inicial al montar el layout
    sendHeartbeat();

    // Enviar cada 5 minutos
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [hasPermission]);
};
