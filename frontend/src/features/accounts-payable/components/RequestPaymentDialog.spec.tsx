import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { RequestPaymentDialog } from './RequestPaymentDialog';
import type { AccountPayable } from '../../../types/accounts-payable.types';
import { storageApi } from '../../../api/storage.api';

vi.mock('../../../api/storage.api', () => ({
  storageApi: { uploadFile: vi.fn() },
}));

vi.mock('../../../components/common/BankSelector', () => ({
  BankSelector: () => null,
}));

const accountPayable = {
  id: 'ap-1',
  apNumber: 'CP-2026-626',
  balance: '4861170',
} as unknown as AccountPayable;

const renderDialog = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
  render(
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <RequestPaymentDialog
        open
        accountPayable={accountPayable}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        loading={false}
      />
    </LocalizationProvider>,
  );
  return onSubmit;
};

const file = (name: string) => new File(['x'], name, { type: 'image/png' });

describe('RequestPaymentDialog', () => {
  beforeEach(() => {
    vi.mocked(storageApi.uploadFile).mockReset();
  });

  it('ofrece dos comprobantes, ambos opcionales', () => {
    renderDialog();

    expect(screen.getByText('Comprobantes (opcionales)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adjuntar comprobante 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adjuntar comprobante 2/ })).toBeInTheDocument();
  });

  it('permite enviar la solicitud sin adjuntar ningún comprobante', async () => {
    const onSubmit = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Monto del pago/), '100000');
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      amount: 100000,
      receiptFileId: undefined,
      receiptFileId2: undefined,
    });
    expect(storageApi.uploadFile).not.toHaveBeenCalled();
  });

  it('sube los dos archivos y los envía como comprobantes 1 y 2', async () => {
    const onSubmit = renderDialog();
    const user = userEvent.setup();
    vi.mocked(storageApi.uploadFile)
      .mockResolvedValueOnce({ id: 'file-1' } as never)
      .mockResolvedValueOnce({ id: 'file-2' } as never);

    const inputs = document.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(2);
    await user.upload(inputs[0] as HTMLInputElement, file('transferencia.png'));
    await user.upload(inputs[1] as HTMLInputElement, file('factura.png'));

    await user.type(screen.getByLabelText(/Monto del pago/), '100000');
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      receiptFileId: 'file-1',
      receiptFileId2: 'file-2',
    });
  });

  // Si solo se usa el segundo botón, el archivo no puede llegar como
  // "comprobante 2" con el primero vacío: el pago quedaría con un hueco.
  it('envía como primer comprobante el archivo adjuntado en el segundo espacio', async () => {
    const onSubmit = renderDialog();
    const user = userEvent.setup();
    vi.mocked(storageApi.uploadFile).mockResolvedValueOnce({ id: 'file-2' } as never);

    const inputs = document.querySelectorAll('input[type="file"]');
    await user.upload(inputs[1] as HTMLInputElement, file('factura.png'));

    await user.type(screen.getByLabelText(/Monto del pago/), '100000');
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      receiptFileId: 'file-2',
      receiptFileId2: undefined,
    });
  });
});
