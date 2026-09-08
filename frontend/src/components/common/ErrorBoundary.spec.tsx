import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FC } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

/** Componente que revienta en el render, como pasaría en producción. */
const Boom: FC<{ error: Error }> = ({ error }) => {
  throw error;
};

const appError = () =>
  new TypeError("Cannot read properties of undefined (reading 'workOrders')");

const chunkError = () =>
  new Error(
    'Failed to fetch dynamically imported module: https://crm/assets/OrderDetailPage-a1b2.js',
  );

describe('ErrorBoundary', () => {
  const reload = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockClear();
    // React registra el error en consola; se silencia para no ensuciar la salida.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload, assign: vi.fn() },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza a sus hijos cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>Contenido normal</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Contenido normal')).toBeInTheDocument();
  });

  it('muestra la pantalla de error en lugar de dejar todo en blanco', () => {
    render(
      <ErrorBoundary>
        <Boom error={appError()} />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/ocurrió un error inesperado/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reintentar/i }),
    ).toBeInTheDocument();
  });

  it('ante un chunk caído auto-recarga una sola vez', () => {
    render(
      <ErrorBoundary>
        <Boom error={chunkError()} />
      </ErrorBoundary>,
    );

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('si ya se recargó, muestra el aviso de versión nueva sin recargar de nuevo', () => {
    sessionStorage.setItem('hs:chunk-reload-at', String(Date.now()));

    render(
      <ErrorBoundary>
        <Boom error={chunkError()} />
      </ErrorBoundary>,
    );

    expect(reload).not.toHaveBeenCalled();
    expect(
      screen.getByText(/hay una versión nueva del sistema/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /actualizar ahora/i }),
    ).toBeInTheDocument();
  });

  it('el botón Reintentar vuelve a renderizar a los hijos', async () => {
    const user = userEvent.setup();
    let shouldFail = true;

    const Flaky: FC = () => {
      if (shouldFail) {
        throw appError();
      }
      return <p>Ya funciona</p>;
    };

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/ocurrió un error inesperado/i)).toBeInTheDocument();

    shouldFail = false;
    await user.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(screen.getByText('Ya funciona')).toBeInTheDocument();
  });

  it('al cambiar de ruta se descarta el error anterior', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/orders/123">
        <Boom error={appError()} />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/ocurrió un error inesperado/i)).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="/dashboard">
        <p>Dashboard</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(
      screen.queryByText(/ocurrió un error inesperado/i),
    ).not.toBeInTheDocument();
  });
});
