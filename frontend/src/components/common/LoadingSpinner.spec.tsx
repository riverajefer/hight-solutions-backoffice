import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renderiza el indicador de progreso', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('no muestra mensaje por defecto', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByText(/cargando/i)).not.toBeInTheDocument();
  });

  it('muestra el mensaje en modo fullScreen', () => {
    render(<LoadingSpinner fullScreen message="Cargando datos..." />);
    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
