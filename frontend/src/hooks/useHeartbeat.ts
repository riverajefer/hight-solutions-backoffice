import { useEffect } from 'react';
import { attendanceApi } from '../api';
import { useAuthStore } from '../store/authStore';
import { PERMISSIONS } from '../utils/constants';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Hook que envía heartbeats de actividad al servidor para mantener viva la
 * jornada de asistencia mientras la sesión/pestaña esté abierta.
 *
 * Regla de negocio: "pestaña abierta = presente". Por eso el heartbeat se envía
 * TAMBIÉN cuando la pestaña está en segundo plano (los backoffice suelen quedar
 * abiertos mientras el usuario trabaja en otra ventana). Los navegadores
 * ralentizan/congelan los timers en pestañas ocultas, así que además se hace un
 * "catch-up" inmediato cuando la pestaña vuelve a estar visible o recibe foco.
 *
 * La jornada se cierra por acciones explícitas (marcar salida, logout) o por el
 * cron de fin de día; el auto-cierre por inactividad queda como red de seguridad
 * relajada en el backend. Solo aplica si el usuario tiene permiso 'use_attendance'.
 */
export const useHeartbeat = () => {
  const { hasPermission } = useAuthStore();

  useEffect(() => {
    // Solo enviar heartbeats si el usuario tiene permiso de asistencia
    if (!hasPermission(PERMISSIONS.USE_ATTENDANCE)) return;

    const sendHeartbeat = async () => {
      try {
        await attendanceApi.heartbeat();
      } catch {
        // Silenciar errores — los heartbeats son opcionales
      }
    };

    // Catch-up: al volver la pestaña a primer plano o recibir foco, reenviar
    // de inmediato (cubre el throttling/freezing de timers en background).
    const handleVisible = () => {
      if (document.visibilityState === 'visible') sendHeartbeat();
    };

    // Enviar uno inicial al montar el layout
    sendHeartbeat();

    // Enviar cada 5 minutos (también en segundo plano, best-effort)
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', sendHeartbeat);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', sendHeartbeat);
    };
  }, [hasPermission]);
};
