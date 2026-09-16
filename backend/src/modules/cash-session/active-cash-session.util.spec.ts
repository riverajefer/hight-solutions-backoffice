import { ConflictException } from '@nestjs/common';
import { findActiveCashSession } from './active-cash-session.util';

describe('findActiveCashSession', () => {
  const makeClient = () => ({
    cashSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  });

  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    client = makeClient();
  });

  describe('sin caja indicada', () => {
    it('devuelve null cuando no hay ninguna caja abierta', async () => {
      client.cashSession.findMany.mockResolvedValue([]);

      await expect(findActiveCashSession(client as any)).resolves.toBeNull();
    });

    it('devuelve la sesión cuando hay exactamente una abierta', async () => {
      const session = { id: 'cs-1', cashRegisterId: 'cr-1' };
      client.cashSession.findMany.mockResolvedValue([session]);

      await expect(findActiveCashSession(client as any)).resolves.toEqual(session);
    });

    it('falla en vez de adivinar cuando hay dos cajas abiertas', async () => {
      client.cashSession.findMany.mockResolvedValue([
        { id: 'cs-1', cashRegisterId: 'cr-1' },
        { id: 'cs-2', cashRegisterId: 'cr-2' },
      ]);

      await expect(findActiveCashSession(client as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('pide solo dos filas: basta para distinguir ninguna, una y varias', async () => {
      client.cashSession.findMany.mockResolvedValue([]);

      await findActiveCashSession(client as any);

      expect(client.cashSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2, orderBy: { openedAt: 'asc' } }),
      );
    });
  });

  describe('con caja indicada', () => {
    it('busca la sesión abierta de esa caja y no puede ser ambigua', async () => {
      const session = { id: 'cs-2', cashRegisterId: 'cr-2' };
      client.cashSession.findFirst.mockResolvedValue(session);

      await expect(findActiveCashSession(client as any, 'cr-2')).resolves.toEqual(
        session,
      );
      expect(client.cashSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cashRegisterId: 'cr-2' }),
        }),
      );
      expect(client.cashSession.findMany).not.toHaveBeenCalled();
    });

    it('devuelve null si esa caja no tiene sesión abierta, aunque otra sí', async () => {
      client.cashSession.findFirst.mockResolvedValue(null);

      await expect(
        findActiveCashSession(client as any, 'cr-3'),
      ).resolves.toBeNull();
    });
  });
});
