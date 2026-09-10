import { Prisma } from '../../generated/prisma';

/**
 * Cálculo del pago de un empleado en un periodo de nómina.
 *
 * Hasta ahora esta fórmula solo existía en el formulario del frontend
 * (`PayrollItemFormPage`, un `useEffect` que escribe el campo `totalPayment`) y
 * el backend guardaba el número que llegara en el DTO, sin recalcularlo. Eso
 * funciona mientras el único origen de un cambio sea alguien tecleando en ese
 * formulario.
 *
 * El descuento por nómina rompe ese supuesto: nace en una OP y se aplica desde
 * el módulo de descuentos, sin que nadie abra el formulario del empleado. Si el
 * total siguiera dependiendo del frontend, el descuento quedaría escrito en su
 * columna pero el empleado cobraría igual.
 *
 * Los conceptos y su signo replican exactamente `calcTotal` del formulario, para
 * que recalcular desde acá no le cambie la cifra a nadie.
 */

/** Conceptos que suman al pago. */
const EARNINGS = [
  'baseSalary',
  'overtimeDaytimeValue',
  'overtimeNighttimeValue',
  'commissions',
  'restDayValue',
  'transportAllowance',
] as const;

/** Conceptos que se restan del pago. */
const DEDUCTIONS = [
  'workdayDiscount',
  'loans',
  'advances',
  'nonPaidDays',
  'epsAndPensionDiscount',
  'employeeFundSavings',
  'orderDeductions',
] as const;

type Amount = Prisma.Decimal | number | string | null | undefined;

export type PayrollTotalInput = Partial<
  Record<(typeof EARNINGS)[number] | (typeof DEDUCTIONS)[number], Amount>
> & {
  /** Turnos extra del registro. Suman igual que un devengado. */
  extraShifts?: { amount: Amount }[];
};

const toDecimal = (value: Amount): Prisma.Decimal =>
  value == null ? new Prisma.Decimal(0) : new Prisma.Decimal(value);

/**
 * Recalcula el pago total del empleado a partir de los conceptos del registro.
 *
 * No hace piso en 0: un total negativo significa que se le está descontando más
 * de lo que gana en el periodo, y eso tiene que ser visible para que alguien lo
 * corrija, no quedar escondido detrás de un `Math.max`.
 */
export function computePayrollTotal(item: PayrollTotalInput): Prisma.Decimal {
  const earnings = EARNINGS.reduce(
    (sum, field) => sum.add(toDecimal(item[field])),
    new Prisma.Decimal(0),
  );

  const extraShifts = (item.extraShifts ?? []).reduce(
    (sum, shift) => sum.add(toDecimal(shift.amount)),
    new Prisma.Decimal(0),
  );

  const deductions = DEDUCTIONS.reduce(
    (sum, field) => sum.add(toDecimal(item[field])),
    new Prisma.Decimal(0),
  );

  return earnings.add(extraShifts).sub(deductions);
}

/**
 * Lo que el empleado alcanza a cubrir en este periodo sin quedar en negativo.
 * Se usa para advertir antes de aplicar un descuento que se come toda la
 * quincena — el art. 149 del CST protege el salario del trabajador y un total
 * en cero casi siempre significa que hay que repartir el cobro.
 */
export function computeAvailableForDeduction(
  item: PayrollTotalInput,
): Prisma.Decimal {
  const currentDeduction = toDecimal(item.orderDeductions);
  return computePayrollTotal(item).add(currentDeduction);
}
