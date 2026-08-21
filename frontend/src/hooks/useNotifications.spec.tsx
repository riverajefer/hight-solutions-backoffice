import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotifications } from './useNotifications';
import { notificationsApi } from '../api/notifications.api';
import { enqueueSnackbar } from 'notistack';

// Aísla el hook de axios/import.meta y de notistack.
vi.mock('../api/notifications.api', () => ({
  notificationsApi: {
    getAll: vi.fn(),
    countUnread: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('notistack', () => ({ enqueueSnackbar: vi.fn() }));

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useNotifications', () => {
  beforeEach(() => {
    (notificationsApi.getAll as any).mockResolvedValue({ data: [{ id: 'n1' }], total: 1 });
    (notificationsApi.countUnread as any).mockResolvedValue({ count: 3 });
    (notificationsApi.markAsRead as any).mockResolvedValue({});
    (notificationsApi.markAllAsRead as any).mockResolvedValue({});
    (notificationsApi.delete as any).mockResolvedValue({});
  });

  afterEach(() => vi.clearAllMocks());

  it('carga las notificaciones y el conteo de no leídas', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.notificationsQuery.isSuccess).toBe(true));

    expect(notificationsApi.getAll).toHaveBeenCalledWith({ limit: 50 });
    expect(result.current.notificationsQuery.data).toEqual({ data: [{ id: 'n1' }], total: 1 });

    await waitFor(() => expect(result.current.unreadCountQuery.isSuccess).toBe(true));
    expect(result.current.unreadCountQuery.data).toEqual({ count: 3 });
  });

  it('pasa los filtros provistos a la API', async () => {
    const { result } = renderHook(() => useNotifications({ limit: 10, isRead: false }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.notificationsQuery.isSuccess).toBe(true));
    expect(notificationsApi.getAll).toHaveBeenCalledWith({ limit: 10, isRead: false });
  });

  it('markAsRead invoca la API', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.markAsReadMutation.mutateAsync('n1');
    });

    expect(notificationsApi.markAsRead).toHaveBeenCalledWith('n1');
  });

  it('markAllAsRead notifica el éxito con un snackbar', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.markAllAsReadMutation.mutateAsync();
    });

    expect(notificationsApi.markAllAsRead).toHaveBeenCalled();
    expect(enqueueSnackbar).toHaveBeenCalledWith(
      'Todas las notificaciones marcadas como leídas',
      { variant: 'success' },
    );
  });

  it('delete muestra un snackbar de éxito', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.deleteMutation.mutateAsync('n1');
    });

    expect(notificationsApi.delete).toHaveBeenCalledWith('n1');
    expect(enqueueSnackbar).toHaveBeenCalledWith('Notificación eliminada', {
      variant: 'success',
    });
  });

  it('muestra el mensaje de error del backend al fallar markAsRead', async () => {
    (notificationsApi.markAsRead as any).mockRejectedValue({
      response: { data: { message: 'No autorizado' } },
    });
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.markAsReadMutation.mutateAsync('n1').catch(() => {});
    });

    expect(enqueueSnackbar).toHaveBeenCalledWith('No autorizado', { variant: 'error' });
  });
});
