import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UpdateAvailableBanner } from './UpdateAvailableBanner';

/** Respuesta de /version.json con el buildId indicado. */
function versionResponse(buildId: string) {
  return {
    ok: true,
    json: async () => ({ buildId, builtAt: '2026-09-10T00:00:00.000Z' }),
  } as Response;
}

const renderBanner = () =>
  render(
    <MemoryRouter>
      <UpdateAvailableBanner />
    </MemoryRouter>,
  );

const bannerText = /hay una versión nueva del sistema/i;

describe('UpdateAvailableBanner', () => {
  const reload = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no muestra nada mientras la versión sea la misma', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(versionResponse('build-1'));

    renderBanner();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
  });

  it('avisa cuando el buildId cambia respecto al de arranque', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(versionResponse('build-1'))
      .mockResolvedValue(versionResponse('build-2'));

    renderBanner();

    expect(await screen.findByText(bannerText)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /actualizar ahora/i }),
    ).toBeInTheDocument();
  });

  it('«Actualizar ahora» recarga la página', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(versionResponse('build-1'))
      .mockResolvedValue(versionResponse('build-2'));

    renderBanner();
    await screen.findByText(bannerText);

    await user.click(screen.getByRole('button', { name: /actualizar ahora/i }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('no vuelve a avisar de una versión ya descartada', async () => {
    sessionStorage.setItem('hs:update-dismissed-build', 'build-2');

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(versionResponse('build-1'))
      .mockResolvedValue(versionResponse('build-2'));

    renderBanner();

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledTimes(2),
    );
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
  });

  it('vuelve a avisar si se publica otra versión distinta a la descartada', async () => {
    sessionStorage.setItem('hs:update-dismissed-build', 'build-2');

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(versionResponse('build-1'))
      .mockResolvedValue(versionResponse('build-3'));

    renderBanner();

    expect(await screen.findByText(bannerText)).toBeInTheDocument();
  });

  it('no rompe nada si /version.json no existe', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('404'));

    renderBanner();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
  });
});
