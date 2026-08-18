import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePaymentDto } from '../../modules/orders/dto/create-payment.dto';
import { PaymentMethod } from '../../generated/prisma';

/**
 * El crédito ("fiado") es la marca de "se entrega y el cliente paga después",
 * no un abono. Registrarlo con monto hacía que la OP naciera pagada y que el
 * pago real posterior quedara duplicado: 30 OPs en producción con $1.994.500.
 */
describe('IsValidPaymentAmount', () => {
  const build = (amount: unknown, paymentMethod: PaymentMethod) =>
    validateSync(
      plainToInstance(CreatePaymentDto, { amount, paymentMethod }),
    ).filter((e) => e.property === 'amount');

  describe('método CREDIT', () => {
    it('acepta monto 0', () => {
      expect(build(0, PaymentMethod.CREDIT)).toHaveLength(0);
    });

    it('rechaza cualquier monto mayor a cero', () => {
      const errors = build(160000, PaymentMethod.CREDIT);
      expect(errors).toHaveLength(1);
      expect(Object.values(errors[0].constraints ?? {})[0]).toContain(
        'el monto debe ser 0',
      );
    });

    it('rechaza montos negativos', () => {
      expect(build(-1, PaymentMethod.CREDIT)).toHaveLength(1);
    });

    // La regla anterior era `@ValidateIf(method !== CREDIT)` + `@IsPositive`, y
    // `@ValidateIf` es a nivel de propiedad: al excluir CREDIT desactivaba
    // también `@IsNumber`, así que pasaba cualquier cosa.
    it('rechaza un monto que no es número', () => {
      expect(build('mucho', PaymentMethod.CREDIT)).toHaveLength(1);
      expect(build(undefined, PaymentMethod.CREDIT)).toHaveLength(1);
    });
  });

  describe('métodos que mueven dinero', () => {
    it.each([
      PaymentMethod.CASH,
      PaymentMethod.TRANSFER,
      PaymentMethod.CARD,
      PaymentMethod.CREDIT_BALANCE,
    ])('%s acepta monto positivo y rechaza 0', (method) => {
      expect(build(50000, method)).toHaveLength(0);
      expect(build(0, method)).toHaveLength(1);
    });
  });
});
