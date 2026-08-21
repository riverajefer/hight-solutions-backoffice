import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from './PageHeader';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('PageHeader', () => {
  it('renderiza el título', () => {
    renderWithRouter(<PageHeader title="Órdenes de Pedido" />);
    expect(screen.getByRole('heading', { name: 'Órdenes de Pedido' })).toBeInTheDocument();
  });

  it('renderiza el subtítulo cuando se provee', () => {
    renderWithRouter(<PageHeader title="Órdenes" subtitle="Listado completo" />);
    expect(screen.getByText('Listado completo')).toBeInTheDocument();
  });

  it('renderiza breadcrumbs con y sin enlace', () => {
    renderWithRouter(
      <PageHeader
        title="Detalle"
        breadcrumbs={[
          { label: 'Inicio', path: '/' },
          { label: 'Actual' },
        ]}
      />,
    );
    const link = screen.getByRole('link', { name: 'Inicio' });
    expect(link).toHaveAttribute('href', '/');
    expect(screen.getByText('Actual')).toBeInTheDocument();
  });

  it('renderiza el nodo de acción', () => {
    renderWithRouter(
      <PageHeader title="Órdenes" action={<button>Nueva orden</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Nueva orden' })).toBeInTheDocument();
  });

  it('oculta el título con hideTitle pero mantiene la acción', () => {
    renderWithRouter(
      <PageHeader title="Oculto" hideTitle action={<button>Acción</button>} />,
    );
    expect(screen.queryByRole('heading', { name: 'Oculto' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
  });
});
