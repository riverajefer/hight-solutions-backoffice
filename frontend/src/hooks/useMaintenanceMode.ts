import { create } from 'zustand';

/**
 * Estado global del modo mantenimiento.
 * Sin persist (in-memory) — se resetea al recargar la página.
 * Activado automáticamente cuando el backend responde con 503.
 */
interface MaintenanceModeState {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  activateMaintenance: (message: string) => void;
  deactivateMaintenance: () => void;
}

const DEFAULT_MESSAGE =
  'El sistema se encuentra en mantenimiento. Por favor intenta más tarde.';

/**
 * Store de Zustand (sin persist) para el modo mantenimiento.
 * Exportado para uso en axios.ts via .getState() fuera del ciclo React.
 */
export const useMaintenanceModeStore = create<MaintenanceModeState>((set) => ({
  isMaintenanceMode: false,
  maintenanceMessage: DEFAULT_MESSAGE,

  activateMaintenance: (message: string) => {
    set({
      isMaintenanceMode: true,
      maintenanceMessage: message || DEFAULT_MESSAGE,
    });
  },

  deactivateMaintenance: () => {
    set({
      isMaintenanceMode: false,
      maintenanceMessage: DEFAULT_MESSAGE,
    });
  },
}));

/**
 * Hook para consumir el estado del modo mantenimiento en componentes React.
 */
export const useMaintenanceMode = () => {
  const isMaintenanceMode = useMaintenanceModeStore(
    (state) => state.isMaintenanceMode,
  );
  const maintenanceMessage = useMaintenanceModeStore(
    (state) => state.maintenanceMessage,
  );
  const activateMaintenance = useMaintenanceModeStore(
    (state) => state.activateMaintenance,
  );
  const deactivateMaintenance = useMaintenanceModeStore(
    (state) => state.deactivateMaintenance,
  );

  return {
    isMaintenanceMode,
    maintenanceMessage,
    activateMaintenance,
    deactivateMaintenance,
  };
};
