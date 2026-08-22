import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatCard } from './StatCard';

const base = {
  title: 'Pendientes',
  value: 42,
  icon: <span data-testid="icon">i</span>,
  color: '#ff0000',
};

describe('StatCard', () => {
  it('renderiza título, valor e icono', () => {
    render(<StatCard {...base} />);
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('muestra el subtítulo cuando se provee', () => {
    render(<StatCard {...base} subtitle="3 vencidas" />);
    expect(screen.getByText('3 vencidas')).toBeInTheDocument();
  });

  it('oculta el valor mientras loading es true', () => {
    render(<StatCard {...base} loading />);
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('no muestra el enlace "Filtrar" sin onClick', () => {
    render(<StatCard {...base} />);
    expect(screen.queryByText('Filtrar')).not.toBeInTheDocument();
  });

  it('muestra "Filtrar" y dispara onClick cuando es clicable', () => {
    const onClick = vi.fn();
    render(<StatCard {...base} onClick={onClick} />);
    const filtrar = screen.getByText('Filtrar');
    expect(filtrar).toBeInTheDocument();
    fireEvent.click(filtrar);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
