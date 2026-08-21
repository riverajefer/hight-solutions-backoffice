import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from './uiStore';

describe('useUIStore', () => {
  beforeEach(() => {
    // Restaura el estado inicial entre pruebas (el store es un singleton).
    useUIStore.setState({ sidebarOpen: true, theme: 'dark', globalSearchOpen: false });
  });

  it('tiene el estado inicial esperado', () => {
    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.theme).toBe('dark');
    expect(state.globalSearchOpen).toBe(false);
  });

  describe('sidebar', () => {
    it('toggleSidebar alterna el valor', () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('setSidebarOpen fija el valor', () => {
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe('theme', () => {
    it('toggleTheme alterna entre dark y light', () => {
      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe('light');
      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('setTheme fija el tema', () => {
      useUIStore.getState().setTheme('light');
      expect(useUIStore.getState().theme).toBe('light');
    });
  });

  describe('búsqueda global', () => {
    it('setGlobalSearchOpen fija el valor', () => {
      useUIStore.getState().setGlobalSearchOpen(true);
      expect(useUIStore.getState().globalSearchOpen).toBe(true);
    });

    it('toggleGlobalSearch alterna el valor', () => {
      useUIStore.getState().toggleGlobalSearch();
      expect(useUIStore.getState().globalSearchOpen).toBe(true);
      useUIStore.getState().toggleGlobalSearch();
      expect(useUIStore.getState().globalSearchOpen).toBe(false);
    });
  });
});
