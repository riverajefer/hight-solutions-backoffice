import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProspects, useProspect, useProspectMetrics } from './useProspects';
import { prospectsApi } from '../../../api/prospects.api';

const { enqueueMock } = vi.hoisted(() => ({ enqueueMock: vi.fn() }));
vi.mock('notistack', () => ({ enqueueSnackbar: enqueueMock }));

vi.mock('../../../api/prospects.api', () => ({
  prospectsApi: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    getMetrics: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addContact: vi.fn(),
    deleteContact: vi.fn(),
    convert: vi.fn(),
  },
}));

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useProspects', () => {
  beforeEach(() => {
    (prospectsApi.findAll as any).mockResolvedValue({ data: [{ id: 'p1' }], meta: {} });
    (prospectsApi.create as any).mockResolvedValue({ id: 'p1' });
    (prospectsApi.update as any).mockResolvedValue({ id: 'p1' });
    (prospectsApi.delete as any).mockResolvedValue({});
    (prospectsApi.addContact as any).mockResolvedValue({ id: 'ct1' });
    (prospectsApi.deleteContact as any).mockResolvedValue({});
    (prospectsApi.convert as any).mockResolvedValue({ clientId: 'c1' });
  });
  afterEach(() => vi.clearAllMocks());

  it('lista prospectos con filtros', async () => {
    const { result } = renderHook(() => useProspects({ status: 'NUEVO' } as any), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.prospectsQuery.isSuccess).toBe(true));
    expect(prospectsApi.findAll).toHaveBeenCalledWith({ status: 'NUEVO' });
  });

  it('create notifica éxito', async () => {
    const { result } = renderHook(() => useProspects(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.createProspectMutation.mutateAsync({ name: 'Juan' } as any);
    });
    expect(enqueueMock).toHaveBeenCalledWith('Prospecto creado', { variant: 'success' });
  });

  it('update y delete llaman a la API', async () => {
    const { result } = renderHook(() => useProspects(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.updateProspectMutation.mutateAsync({ id: 'p1', data: { name: 'X' } as any });
    });
    await act(async () => {
      await result.current.deleteProspectMutation.mutateAsync('p1');
    });
    expect(prospectsApi.update).toHaveBeenCalledWith('p1', { name: 'X' });
    expect(prospectsApi.delete).toHaveBeenCalledWith('p1');
  });

  it('registrar y eliminar contactos', async () => {
    const { result } = renderHook(() => useProspects(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.addContactMutation.mutateAsync({
        id: 'p1',
        data: { medium: 'WHATSAPP' } as any,
      });
    });
    await act(async () => {
      await result.current.deleteContactMutation.mutateAsync({ id: 'p1', contactId: 'ct1' });
    });
    expect(prospectsApi.addContact).toHaveBeenCalledWith('p1', { medium: 'WHATSAPP' });
    expect(prospectsApi.deleteContact).toHaveBeenCalledWith('p1', 'ct1');
    expect(enqueueMock).toHaveBeenCalledWith('Contacto registrado', { variant: 'success' });
  });

  it('convert vincula el prospecto a un cliente', async () => {
    const { result } = renderHook(() => useProspects(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.convertProspectMutation.mutateAsync({
        id: 'p1',
        data: { clientId: 'c1' } as any,
      });
    });
    expect(prospectsApi.convert).toHaveBeenCalledWith('p1', { clientId: 'c1' });
  });

  it('muestra el error del backend al fallar la eliminación', async () => {
    (prospectsApi.delete as any).mockRejectedValue({
      response: { data: { message: 'No se puede eliminar' } },
    });
    const { result } = renderHook(() => useProspects(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.deleteProspectMutation.mutateAsync('p1').catch(() => {});
    });
    expect(enqueueMock).toHaveBeenCalledWith('No se puede eliminar', { variant: 'error' });
  });
});

describe('useProspect / useProspectMetrics', () => {
  beforeEach(() => {
    (prospectsApi.findOne as any).mockResolvedValue({ id: 'p1' });
    (prospectsApi.getMetrics as any).mockResolvedValue({ byAdvisor: [] });
  });
  afterEach(() => vi.clearAllMocks());

  it('useProspect consulta por id', async () => {
    const { result } = renderHook(() => useProspect('p1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(prospectsApi.findOne).toHaveBeenCalledWith('p1');
  });

  it('useProspect no consulta sin id', async () => {
    vi.clearAllMocks();
    const { result } = renderHook(() => useProspect(undefined), { wrapper: createWrapper() });
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.fetchStatus).toBe('idle');
    expect(prospectsApi.findOne).not.toHaveBeenCalled();
  });

  it('useProspectMetrics consulta las métricas del pipeline', async () => {
    const { result } = renderHook(() => useProspectMetrics({ advisorId: 'a1' } as any), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(prospectsApi.getMetrics).toHaveBeenCalledWith({ advisorId: 'a1' });
  });
});
