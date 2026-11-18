import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ManualsPage from './ManualsPage';
import { useAuthStore } from '../../../store/authStore';
import { MANUALS } from '../manuals.catalog';
import { PERMISSIONS } from '../../../utils/constants';

const ADMIN_MANUAL = MANUALS.find((m) => m.permissions)!;

const renderPage = (initialUrl = '/manuales') =>
  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <ManualsPage />
    </MemoryRouter>,
  );

describe('ManualsPage', () => {
  afterEach(() => {
    useAuthStore.setState({ permissions: [] });
  });

  it('oculta los manuales restringidos a quien no tiene el permiso', () => {
    useAuthStore.setState({ permissions: [] });
    renderPage();

    expect(screen.queryByText(ADMIN_MANUAL.title)).not.toBeInTheDocument();
    const publicManuals = MANUALS.filter((m) => !m.permissions);
    publicManuals.forEach((m) => {
      expect(screen.getAllByText(m.title).length).toBeGreaterThan(0);
    });
  });

  it('muestra el manual de administración con uno de sus permisos', () => {
    useAuthStore.setState({ permissions: [PERMISSIONS.RESET_USER_2FA] });
    renderPage();

    expect(screen.getAllByText(ADMIN_MANUAL.title).length).toBeGreaterThan(0);
  });

  it('abre en el visor el manual indicado en la URL', () => {
    const target = MANUALS.find((m) => !m.permissions && m.slug !== MANUALS[0].slug)!;
    renderPage(`/manuales?doc=${target.slug}`);

    expect(screen.getByTitle(target.title)).toHaveAttribute(
      'src',
      expect.stringContaining(encodeURIComponent(target.file)),
    );
  });

  it('no deja abrir por URL un manual restringido sin permiso', () => {
    renderPage(`/manuales?doc=${ADMIN_MANUAL.slug}`);

    expect(screen.queryByTitle(ADMIN_MANUAL.title)).not.toBeInTheDocument();
  });
});
