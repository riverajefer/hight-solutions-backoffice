import { beforeEach, describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMaintenanceMode, useMaintenanceModeStore } from './useMaintenanceMode';

const DEFAULT_MESSAGE =
  'El sistema se encuentra en mantenimiento. Por favor intenta más tarde.';

describe('useMaintenanceMode', () => {
  beforeEach(() => {
    useMaintenanceModeStore.setState({
      isMaintenanceMode: false,
      maintenanceMessage: DEFAULT_MESSAGE,
    });
  });

  it('estado inicial: mantenimiento apagado con mensaje por defecto', () => {
    const { result } = renderHook(() => useMaintenanceMode());
    expect(result.current.isMaintenanceMode).toBe(false);
    expect(result.current.maintenanceMessage).toBe(DEFAULT_MESSAGE);
  });

  it('activa el mantenimiento con un mensaje personalizado', () => {
    const { result } = renderHook(() => useMaintenanceMode());
    act(() => result.current.activateMaintenance('Volvemos a las 3pm'));
    expect(result.current.isMaintenanceMode).toBe(true);
    expect(result.current.maintenanceMessage).toBe('Volvemos a las 3pm');
  });

  it('activar sin mensaje usa el mensaje por defecto', () => {
    const { result } = renderHook(() => useMaintenanceMode());
    act(() => result.current.activateMaintenance(''));
    expect(result.current.isMaintenanceMode).toBe(true);
    expect(result.current.maintenanceMessage).toBe(DEFAULT_MESSAGE);
  });

  it('desactiva el mantenimiento y restaura el mensaje por defecto', () => {
    const { result } = renderHook(() => useMaintenanceMode());
    act(() => result.current.activateMaintenance('X'));
    act(() => result.current.deactivateMaintenance());
    expect(result.current.isMaintenanceMode).toBe(false);
    expect(result.current.maintenanceMessage).toBe(DEFAULT_MESSAGE);
  });
});
