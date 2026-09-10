import { Prisma } from '../../generated/prisma';
import {
  computeAvailableForDeduction,
  computePayrollTotal,
} from './payroll-total.util';

/**
 * La fórmula del pago vivía solo en el formulario del frontend y el backend
 * guardaba el número que llegara. Estas pruebas fijan la aritmética del lado del
 * servidor, que es la que corre cuando un descuento por nómina entra sin que
 * nadie abra ese formulario.
 */
describe('computePayrollTotal', () => {
  const d = (n: number) => new Prisma.Decimal(n);

  it('suma devengados y resta descuentos', () => {
    const total = computePayrollTotal({
      baseSalary: 1_300_000,
      transportAllowance: 200_000,
      commissions: 150_000,
      epsAndPensionDiscount: 104_000,
      loans: 50_000,
    });

    expect(total.toNumber()).toBe(1_496_000);
  });

  it('los turnos extra suman como un devengado', () => {
    const total = computePayrollTotal({
      baseSalary: 1_000_000,
      extraShifts: [{ amount: 80_000 }, { amount: 120_000 }],
    });

    expect(total.toNumber()).toBe(1_200_000);
  });

  it('el descuento de órdenes resta del pago', () => {
    const sinDescuento = computePayrollTotal({ baseSalary: 1_000_000 });
    const conDescuento = computePayrollTotal({
      baseSalary: 1_000_000,
      orderDeductions: 250_000,
    });

    expect(sinDescuento.sub(conDescuento).toNumber()).toBe(250_000);
  });

  // El descuento de órdenes es su propio renglón justamente para poder auditarlo
  // aparte de préstamos y anticipos, pero debe pesar igual en el total.
  it('el descuento de órdenes es independiente de préstamos y anticipos', () => {
    const total = computePayrollTotal({
      baseSalary: 1_000_000,
      loans: 100_000,
      advances: 200_000,
      orderDeductions: 300_000,
    });

    expect(total.toNumber()).toBe(400_000);
  });

  it('trata los conceptos nulos como cero', () => {
    const total = computePayrollTotal({
      baseSalary: 1_000_000,
      commissions: null,
      loans: undefined,
      orderDeductions: null,
    });

    expect(total.toNumber()).toBe(1_000_000);
  });

  it('acepta Decimal, número y cadena sin cambiar el resultado', () => {
    const total = computePayrollTotal({
      baseSalary: d(1_000_000),
      commissions: '50000',
      loans: 25_000,
    });

    expect(total.toNumber()).toBe(1_025_000);
  });

  // Sin piso en 0 a propósito: un total negativo significa que se le está
  // descontando más de lo que gana, y eso tiene que verse para corregirlo.
  it('no pone piso en cero cuando el descuento supera lo devengado', () => {
    const total = computePayrollTotal({
      baseSalary: 500_000,
      orderDeductions: 800_000,
    });

    expect(total.toNumber()).toBe(-300_000);
  });

  it('no pierde los centavos', () => {
    const total = computePayrollTotal({
      baseSalary: '1000000.55',
      orderDeductions: '0.55',
    });

    expect(total.toNumber()).toBe(1_000_000);
  });
});

describe('computeAvailableForDeduction', () => {
  it('devuelve lo que el empleado alcanza a cubrir en el periodo', () => {
    const disponible = computeAvailableForDeduction({
      baseSalary: 1_000_000,
      epsAndPensionDiscount: 80_000,
    });

    expect(disponible.toNumber()).toBe(920_000);
  });

  // Ignora el descuento ya aplicado para no descontarlo dos veces al preguntar
  // "¿cuánto más le cabe?".
  it('no cuenta dos veces el descuento ya registrado', () => {
    const disponible = computeAvailableForDeduction({
      baseSalary: 1_000_000,
      orderDeductions: 300_000,
    });

    expect(disponible.toNumber()).toBe(1_000_000);
  });
});
