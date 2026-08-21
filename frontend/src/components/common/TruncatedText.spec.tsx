import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TruncatedText } from './TruncatedText';

describe('TruncatedText', () => {
  it('renderiza el texto', () => {
    render(<TruncatedText text="Contenido largo de ejemplo" />);
    expect(screen.getByText('Contenido largo de ejemplo')).toBeInTheDocument();
  });

  it('renderiza sin tooltip cuando showTooltip es false', () => {
    render(<TruncatedText text="Sin tooltip" showTooltip={false} />);
    expect(screen.getByText('Sin tooltip')).toBeInTheDocument();
  });

  it('renderiza contenido no-string (sin tooltip derivado)', () => {
    render(<TruncatedText text={<span data-testid="nodo">nodo</span>} />);
    expect(screen.getByTestId('nodo')).toBeInTheDocument();
  });

  it('aplica truncado multilínea con maxLines > 1', () => {
    render(<TruncatedText text="Texto multilínea" maxLines={2} />);
    const el = screen.getByText('Texto multilínea');
    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle({ overflow: 'hidden' });
  });
});
