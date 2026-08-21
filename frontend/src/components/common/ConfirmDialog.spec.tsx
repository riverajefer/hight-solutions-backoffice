import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

const baseProps = {
  open: true,
  title: 'Eliminar orden',
  message: '¿Seguro que deseas eliminar esta orden?',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ConfirmDialog', () => {
  it('renderiza título y mensaje cuando está abierto', () => {
    render(<ConfirmDialog {...baseProps} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Eliminar orden')).toBeInTheDocument();
    expect(
      screen.getByText('¿Seguro que deseas eliminar esta orden?'),
    ).toBeInTheDocument();
  });

  it('no renderiza el contenido cuando open es false', () => {
    render(<ConfirmDialog {...baseProps} open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('Eliminar orden')).not.toBeInTheDocument();
  });

  it('usa los textos por defecto de los botones', () => {
    render(<ConfirmDialog {...baseProps} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('permite personalizar los textos de los botones', () => {
    render(
      <ConfirmDialog
        {...baseProps}
        confirmText="Sí, eliminar"
        cancelText="No"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Sí, eliminar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
  });

  it('llama a onConfirm al pulsar el botón de confirmar', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('llama a onCancel al pulsar el botón de cancelar', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('deshabilita ambos botones mientras isLoading es true', () => {
    render(<ConfirmDialog {...baseProps} isLoading onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
