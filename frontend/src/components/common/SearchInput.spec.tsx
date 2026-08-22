import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('usa el placeholder por defecto', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('respeta un placeholder personalizado', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Buscar cliente" />);
    expect(screen.getByPlaceholderText('Buscar cliente')).toBeInTheDocument();
  });

  it('muestra el valor controlado', () => {
    render(<SearchInput value="hola" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('hola')).toBeInTheDocument();
  });

  it('invoca onChange con el texto escrito', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'abc' } });
    expect(onChange).toHaveBeenCalledWith('abc');
  });
});
