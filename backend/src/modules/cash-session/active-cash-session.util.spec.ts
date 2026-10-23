import { ConflictException } from '@nestjs/common';
import {
  assertCashSessionNotCounting,
  assertMovementChangeAllowedDuringCount,
  findActiveCashSession,
} from './active-cash-session.util';
import { Prisma } from '../../generated/prisma';

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

describe('assertCashSessionNotCounting', () => {
  const counting = { countStartedAt: new Date('2026-10-23T14:00:00Z') };

  it('bloquea el efectivo mientras Caja cuenta', () => {
    expect(() => assertCashSessionNotCounting(counting, 'CASH')).toThrow(
      ConflictException,
    );
  });

  it('deja pasar lo que no toca el cajón', () => {
    for (const method of ['TRANSFER', 'CARD', 'CREDIT_BALANCE', undefined]) {
      expect(() => assertCashSessionNotCounting(counting, method)).not.toThrow();
    }
  });

  it('deja pasar el efectivo si no hay arqueo o no hay caja', () => {
    expect(() =>
      assertCashSessionNotCounting({ countStartedAt: null }, 'CASH'),
    ).not.toThrow();
    expect(() => assertCashSessionNotCounting(null, 'CASH')).not.toThrow();
  });
});

describe('assertMovementChangeAllowedDuringCount', () => {
  const makeClient = (movement: unknown) => ({
    cashMovement: { findUnique: jest.fn().mockResolvedValue(movement) },
  });
  const cashMovement = (session: Record<string, unknown>) => ({
    amount: new Prisma.Decimal(50000),
    paymentMethod: 'CASH',
    cashSession: { status: 'OPEN', countStartedAt: new Date(), ...session },
  });
  const run = (movement: unknown, next: any) =>
    assertMovementChangeAllowedDuringCount(
      makeClient(movement) as any,
      'mov-1',
      next,
    );

  it('bloquea cambiar el monto de un abono en efectivo durante el arqueo', async () => {
    await expect(
      run(cashMovement({}), {
        amount: new Prisma.Decimal(60000),
        paymentMethod: 'CASH',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('bloquea anular un movimiento en efectivo durante el arqueo', async () => {
    await expect(run(cashMovement({}), null)).rejects.toThrow(ConflictException);
  });

  it('bloquea pasar una transferencia a efectivo durante el arqueo', async () => {
    await expect(
      run(
        { ...cashMovement({}), paymentMethod: 'TRANSFER' },
        { amount: new Prisma.Decimal(50000), paymentMethod: 'CASH' },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('deja pasar el formulario que reenvía el abono sin cambios', async () => {
    await expect(
      run(cashMovement({}), {
        amount: new Prisma.Decimal(50000),
        paymentMethod: 'CASH',
      }),
    ).resolves.toBeUndefined();
  });

  it('deja pasar cambios en una transferencia', async () => {
    await expect(
      run(
        { ...cashMovement({}), paymentMethod: 'TRANSFER' },
        { amount: new Prisma.Decimal(70000), paymentMethod: 'TRANSFER' },
      ),
    ).resolves.toBeUndefined();
  });

  it('no aplica a sesiones sin arqueo ni a sesiones cerradas', async () => {
    await expect(
      run(cashMovement({ countStartedAt: null }), null),
    ).resolves.toBeUndefined();
    await expect(
      run(cashMovement({ status: 'CLOSED' }), null),
    ).resolves.toBeUndefined();
  });
});
