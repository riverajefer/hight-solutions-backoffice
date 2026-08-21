import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSuppliers, useSupplier } from './useSuppliers';
import { suppliersApi } from '../../../api/suppliers.api';

vi.mock('../../../api/suppliers.api', () => ({
  suppliersApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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

describe('useSuppliers', () => {
  beforeEach(() => {
    (suppliersApi.getAll as any).mockResolvedValue({ data: [{ id: 's1' }] });
    (suppliersApi.getById as any).mockResolvedValue({ id: 's1' });
    (suppliersApi.create as any).mockResolvedValue({ id: 's1' });
    (suppliersApi.update as any).mockResolvedValue({ id: 's1' });
    (suppliersApi.delete as any).mockResolvedValue({});
  });

  afterEach(() => vi.clearAllMocks());

  it('lista proveedores con los parámetros', async () => {
    const { result } = renderHook(() => useSuppliers({ search: 'acme' } as any), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.suppliersQuery.isSuccess).toBe(true));
    expect(suppliersApi.getAll).toHaveBeenCalledWith({ search: 'acme' });
  });

  it('create pasa data y el flag force', async () => {
    const { result } = renderHook(() => useSuppliers(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.createSupplierMutation.mutateAsync({
        data: { name: 'Nuevo' } as any,
        force: true,
      });
    });
    expect(suppliersApi.create).toHaveBeenCalledWith({ name: 'Nuevo' }, true);
  });

  it('create usa force=false por defecto', async () => {
    const { result } = renderHook(() => useSuppliers(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.createSupplierMutation.mutateAsync({ data: { name: 'X' } as any });
    });
    expect(suppliersApi.create).toHaveBeenCalledWith({ name: 'X' }, false);
  });

  it('update y delete llaman a la API', async () => {
    const { result } = renderHook(() => useSuppliers(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.updateSupplierMutation.mutateAsync({ id: 's1', data: { name: 'E' } as any });
    });
    await act(async () => {
      await result.current.deleteSupplierMutation.mutateAsync('s1');
    });
    expect(suppliersApi.update).toHaveBeenCalledWith('s1', { name: 'E' });
    expect(suppliersApi.delete).toHaveBeenCalledWith('s1');
  });
});

describe('useSupplier', () => {
  beforeEach(() => (suppliersApi.getById as any).mockResolvedValue({ id: 's1' }));
  afterEach(() => vi.clearAllMocks());

  it('consulta un proveedor por id', async () => {
    const { result } = renderHook(() => useSupplier('s1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(suppliersApi.getById).toHaveBeenCalledWith('s1');
  });

  it('no consulta con id vacío', async () => {
    vi.clearAllMocks();
    const { result } = renderHook(() => useSupplier(''), { wrapper: createWrapper() });
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.fetchStatus).toBe('idle');
    expect(suppliersApi.getById).not.toHaveBeenCalled();
  });
});
