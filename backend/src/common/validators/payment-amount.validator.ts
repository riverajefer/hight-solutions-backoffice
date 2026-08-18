import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { PaymentMethod } from '../../generated/prisma';

/**
 * Valida el monto de un pago según su método.
 *
 * `CREDIT` ("Crédito") no es dinero que entre: es la marca de que la OP se
 * entrega y el cliente paga después. Su monto debe ser 0 y el valor del trabajo
 * queda como saldo pendiente de la orden. Si se registra con monto, la orden
 * aparece pagada sin que haya entrado un peso y el abono real posterior queda
 * duplicado.
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

    return this.isCredit(args) ? amount === 0 : amount > 0;
  }

  defaultMessage(args: ValidationArguments): string {
    return this.isCredit(args)
      ? 'Un pago a crédito no registra dinero: el monto debe ser 0. ' +
          'El valor de la orden queda como saldo pendiente.'
      : 'El monto debe ser mayor a cero para este método de pago';
  }

  private isCredit(args: ValidationArguments): boolean {
    const method = (args.object as { paymentMethod?: PaymentMethod })
      .paymentMethod;
    return method === PaymentMethod.CREDIT;
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
