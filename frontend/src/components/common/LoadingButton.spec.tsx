import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SaveIcon from '@mui/icons-material/Save';
import { Tooltip } from '@mui/material';
import { LoadingButton, IconLoadingButton } from './LoadingButton';

describe('LoadingButton', () => {
  it('muestra el spinner y marca aria-busy mientras carga', () => {
    render(<LoadingButton loading>Guardar</LoadingButton>);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('sin loading no muestra spinner', () => {
    render(<LoadingButton>Guardar</LoadingButton>);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false');
  });

  it('no dispara onClick mientras carga', async () => {
    const onClick = vi.fn();
    render(
      <LoadingButton loading onClick={onClick}>
        Guardar
      </LoadingButton>,
    );

    // MUI le pone `pointer-events: none` al botón deshabilitado, así que
    // user-event se negaría a hacer clic; lo forzamos para probar que ni aun
    // así se dispara el handler.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('dispara onClick cuando no está cargando', async () => {
    const onClick = vi.fn();
    render(<LoadingButton onClick={onClick}>Guardar</LoadingButton>);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respeta disabled aunque no esté cargando', () => {
    render(<LoadingButton disabled>Guardar</LoadingButton>);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('con startIcon, el spinner reemplaza el ícono y el label se queda', () => {
    const { rerender } = render(
      <LoadingButton startIcon={<SaveIcon data-testid="save-icon" />}>Guardar</LoadingButton>,
    );
    expect(screen.getByTestId('save-icon')).toBeInTheDocument();

    rerender(
      <LoadingButton loading startIcon={<SaveIcon data-testid="save-icon" />}>
        Guardar
      </LoadingButton>,
    );

    expect(screen.queryByTestId('save-icon')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    // El label no se reemplaza por "Cargando…": así el ancho no salta.
    expect(screen.getByRole('button')).toHaveTextContent('Guardar');
  });

  it('sin ícono, el label sigue montado mientras carga', () => {
    render(<LoadingButton loading>Guardar</LoadingButton>);

    expect(screen.getByRole('button')).toHaveTextContent('Guardar');
  });

  it('conserva el nombre accesible mientras carga', () => {
    // El label se esconde con `color: transparent`, no con `visibility`: si se
    // ocultara de verdad saldría del árbol de accesibilidad y el botón quedaría
    // sin nombre para un lector de pantalla justo cuando más importa.
    render(<LoadingButton loading>Confirmar</LoadingButton>);

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
  });

  it('reenvía props nativas como type', () => {
    render(<LoadingButton type="submit">Enviar</LoadingButton>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});

describe('LoadingButton dentro de un Tooltip', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('no advierte por hijo deshabilitado cuando está cargando', async () => {
    // Este es el motivo del <span> envolvente: un <Button disabled> suelto
    // dentro de un Tooltip hace que MUI grite en consola y el tooltip muera.
    render(
      <Tooltip title="Aprobar el descuento">
        <LoadingButton loading startIcon={<SaveIcon />}>
          Aprobar
        </LoadingButton>
      </Tooltip>,
    );

    const warned = errorSpy.mock.calls.some((call) =>
      String(call[0]).includes('disabled button child'),
    );
    expect(warned).toBe(false);
  });

  it('reenvía las props del Tooltip al mismo nodo que el ref', async () => {
    // MUI clona su hijo inyectándole handlers y un ref. Si los handlers caen en
    // el botón y el ref en el span, advierte y el tooltip nunca aparece.
    render(
      <Tooltip title="Aprobar el descuento">
        <LoadingButton startIcon={<SaveIcon />}>Aprobar</LoadingButton>
      </Tooltip>,
    );

    await userEvent.hover(screen.getByRole('button'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Aprobar el descuento');
    const warned = errorSpy.mock.calls.some((call) =>
      String(call[0]).includes('not forwarding its props correctly'),
    );
    expect(warned).toBe(false);
  });

  it('muestra el tooltip propio al pasar el mouse', async () => {
    render(
      <LoadingButton tooltip="Guardar los cambios">Guardar</LoadingButton>,
    );

    await userEvent.hover(screen.getByRole('button'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Guardar los cambios');
  });
});

describe('IconLoadingButton', () => {
  it('cambia el ícono por el spinner mientras carga', () => {
    const { rerender } = render(
      <IconLoadingButton aria-label="Eliminar">
        <SaveIcon data-testid="icon" />
      </IconLoadingButton>,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();

    rerender(
      <IconLoadingButton loading aria-label="Eliminar">
        <SaveIcon data-testid="icon" />
      </IconLoadingButton>,
    );

    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Eliminar');
  });

  it('no dispara onClick mientras carga', async () => {
    const onClick = vi.fn();
    render(
      <IconLoadingButton loading onClick={onClick} aria-label="Eliminar">
        <SaveIcon />
      </IconLoadingButton>,
    );

    await userEvent.setup({ pointerEventsCheck: 0 }).click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
  });
});
