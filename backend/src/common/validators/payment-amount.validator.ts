import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { PaymentMethod } from '../../generated/prisma';
import { requiresZeroAmountOnOrder } from '../utils/payment-method.util';

/**
 * Valida el monto de un pago según su método.
 *
 * `CREDIT` ("Crédito") no es dinero que entre: es la marca de que la OP se
 * entrega y el cliente paga después. Su monto debe ser 0 y el valor del trabajo
 * queda como saldo pendiente de la orden. Si se registra con monto, la orden
 * aparece pagada sin que haya entrado un peso y el abono real posterior queda
 * duplicado.
 *
 * `PAYROLL_DEDUCTION` ("Descuento por nómina") sigue la misma regla y por el
 * mismo motivo: al crear la OP el descuento aún no ha ocurrido. El abono con el
 * valor real lo genera el módulo `payroll-deductions` cuando el descuento se
 * aplica sobre la nómina, sin pasar por este DTO.
 *
 * No se puede expresar con `@ValidateIf` + `@IsPositive`: `@ValidateIf` es a
 * nivel de propiedad, así que al excluir CREDIT se desactivan *todos* los
 * validadores del monto (incluido `@IsNumber`), que es justo por donde entraron
 * los registros mal formados.
 */
@ValidatorConstraint({ name: 'paymentAmountMatchesMethod', async: false })
class PaymentAmountMatchesMethodConstraint
  implements ValidatorConstraintInterface
{
  validate(amount: unknown, args: ValidationArguments): boolean {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) return false;

    return this.mustBeZero(args) ? amount === 0 : amount > 0;
  }

  defaultMessage(args: ValidationArguments): string {
    if (!this.mustBeZero(args)) {
      return 'El monto debe ser mayor a cero para este método de pago';
    }

    return this.methodOf(args) === PaymentMethod.PAYROLL_DEDUCTION
      ? 'Un descuento por nómina no registra dinero al crear la orden: el ' +
          'monto debe ser 0. El valor queda como saldo pendiente y se salda ' +
          'cuando nómina aplique el descuento.'
      : 'Un pago a crédito no registra dinero: el monto debe ser 0. ' +
          'El valor de la orden queda como saldo pendiente.';
  }

  private methodOf(args: ValidationArguments): PaymentMethod | undefined {
    return (args.object as { paymentMethod?: PaymentMethod }).paymentMethod;
  }

  private mustBeZero(args: ValidationArguments): boolean {
    return requiresZeroAmountOnOrder(this.methodOf(args));
  }
}

export function IsValidPaymentAmount(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: PaymentAmountMatchesMethodConstraint,
    });
  };
}
