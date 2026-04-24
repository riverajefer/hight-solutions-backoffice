import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  globalSearchOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setGlobalSearchOpen: (open: boolean) => void;
  toggleGlobalSearch: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark',
      globalSearchOpen: false,

      toggleSidebar: () => {
        set((state) => ({
          sidebarOpen: !state.sidebarOpen,
        }));
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      toggleTheme: () => {
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        }));
      },

      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
      },

      setGlobalSearchOpen: (open: boolean) => {
        set({ globalSearchOpen: open });
      },

      toggleGlobalSearch: () => {
        set((state) => ({ globalSearchOpen: !state.globalSearchOpen }));
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen, theme: state.theme }),
    }
  )
);

