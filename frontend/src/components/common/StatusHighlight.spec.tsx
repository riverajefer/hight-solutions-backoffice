import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusHighlight } from './StatusHighlight';

describe('StatusHighlight', () => {
  it('muestra la etiqueta "Estado actual" y el valor', () => {
    render(<StatusHighlight label="Aprobada" color="success" />);
    expect(screen.getByText('Estado actual')).toBeInTheDocument();
    expect(screen.getByText('Aprobada')).toBeInTheDocument();
  });

  it('renderiza la variante gradient sin romper', () => {
    render(<StatusHighlight label="En proceso" color="gradient" />);
    expect(screen.getByText('En proceso')).toBeInTheDocument();
  });

  it('acepta cualquiera de los colores del tema', () => {
    render(<StatusHighlight label="Error" color="error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
