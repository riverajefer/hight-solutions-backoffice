import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoidPaymentDialog from './VoidPaymentDialog';
import type { Payment } from '../../../types/order.types';

const payment = {
  id: 'pay-1',
  amount: '500000',
  paymentMethod: 'TRANSFER',
  paymentDate: '2026-08-31T16:01:00.000Z',
  reference: null,
  notes: null,
  bankEntity: null,
  receiptFileId: null,
  createdAt: '2026-08-31T16:01:00.000Z',
  isVoided: false,
  voidedAt: null,
  voidReason: null,
  voidedBy: null,
  receivedBy: {
    id: 'u1',
    email: 'laura@example.com',
    firstName: 'Laura',
    lastName: 'Maldonado',
  },
  cashMovement: null,
} as unknown as Payment;

const renderDialog = (
  { voidsDirectly = true } = {},
  onSubmit = vi.fn().mockResolvedValue(undefined),
) => {
  render(
    <VoidPaymentDialog
      open
      payment={payment}
      onClose={vi.fn()}
      onSubmit={onSubmit}
      voidsDirectly={voidsDirectly}
    />,
  );
  return onSubmit;
};

describe('VoidPaymentDialog', () => {
  it('muestra el pago que se va a anular', () => {
    renderDialog();

    expect(screen.getByText(/500\.000/)).toBeInTheDocument();
    expect(screen.getByText('Transferencia')).toBeInTheDocument();
    expect(screen.getByText(/Laura Maldonado/)).toBeInTheDocument();
  });

  // El usuario no puede saber desde la orden si la caja de ese pago ya cerró,
  // así que el diálogo tiene que avisar que puede terminar en solicitud.
  it('advierte que con la caja cerrada la anulación queda pendiente de autorización', () => {
    renderDialog();

    expect(
      screen.getByText(/pendiente de\s+autorización del administrador/i),
    ).toBeInTheDocument();
  });

  // Al comercial la anulación NUNCA se le ejecuta de una: decirle que "depende
  // de si la caja está cerrada" le haría creer que el saldo ya cambió.
  it('le habla de solicitud a quien no puede anular directo', () => {
    renderDialog({ voidsDirectly: false });

    expect(
      screen.getByRole('button', { name: /Solicitar anulación/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/el saldo de la orden no cambia hasta que él la apruebe/i),
    ).toBeInTheDocument();
  });

  it('no envía si el motivo es demasiado corto', async () => {
    const onSubmit = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Motivo/i), 'error');
    await user.click(screen.getByRole('button', { name: /Anular pago/i }));

    expect(
      await screen.findByText(/mínimo 10 caracteres/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía el id del pago y el motivo', async () => {
    const onSubmit = renderDialog();
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText(/Motivo/i),
      'Pago duplicado, el mismo soporte ya se registró',
    );
    await user.click(screen.getByRole('button', { name: /Anular pago/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        'pay-1',
        'Pago duplicado, el mismo soporte ya se registró',
      ),
    );
  });
});
