import { describe, expect, it } from 'vitest';
import {
  formatCurrencyInput,
  parseCurrencyInput,
  roundCurrency,
  sanitizeCurrencyInput,
  toCurrencyInputValue,
} from './currencyInput';

describe('sanitizeCurrencyInput', () => {
  it('deja solo los dígitos cuando no hay separador', () => {
    expect(sanitizeCurrencyInput('1500000')).toBe('1500000');
    expect(sanitizeCurrencyInput('$ 1.500.000')).toBe('1500000');
  });

  it('quita los ceros a la izquierda', () => {
    expect(sanitizeCurrencyInput('0042')).toBe('42');
    expect(sanitizeCurrencyInput('0')).toBe('0');
  });

  it('acepta coma o punto como separador decimal', () => {
    expect(sanitizeCurrencyInput('142,85')).toBe('142.85');
    expect(sanitizeCurrencyInput('142.85')).toBe('142.85');
  });

  it('recorta a dos decimales', () => {
    expect(sanitizeCurrencyInput('142,8567')).toBe('142.85');
  });

  it('interpreta los miles ya agrupados de un valor pegado', () => {
    expect(sanitizeCurrencyInput('1.500.000')).toBe('1500000');
    expect(sanitizeCurrencyInput('1.500.000,55')).toBe('1500000.55');
    expect(sanitizeCurrencyInput('1.500,5')).toBe('1500.5');
  });

  it('no confunde con decimales el punto de miles que pone el propio campo', () => {
    // El campo ya mostraba "1.000" y el usuario tecleó otro 0 al final.
    expect(sanitizeCurrencyInput('1.0000')).toBe('10000');
    expect(sanitizeCurrencyInput('10.0000')).toBe('100000');
    // Y si después abre decimales con coma, los miles siguen siendo miles.
    expect(sanitizeCurrencyInput('1.500,')).toBe('1500.');
  });

  it('conserva el separador mientras el usuario escribe', () => {
    expect(sanitizeCurrencyInput('142,')).toBe('142.');
    expect(sanitizeCurrencyInput('142,8')).toBe('142.8');
  });
});

describe('formatCurrencyInput', () => {
  it('agrupa los miles con punto', () => {
    expect(formatCurrencyInput('1500000')).toBe('1.500.000');
  });

  it('muestra los decimales con coma', () => {
    expect(formatCurrencyInput('142.85')).toBe('142,85');
    expect(formatCurrencyInput('142,85')).toBe('142,85');
    expect(formatCurrencyInput(142.85)).toBe('142,85');
  });

  it('mantiene la coma visible mientras se escriben los decimales', () => {
    expect(formatCurrencyInput('142.')).toBe('142,');
  });

  it('devuelve cadena vacía sin valor', () => {
    expect(formatCurrencyInput('')).toBe('');
    expect(formatCurrencyInput('abc')).toBe('');
  });
});

describe('parseCurrencyInput', () => {
  it('convierte el valor tecleado a número', () => {
    expect(parseCurrencyInput('142,85')).toBe(142.85);
    expect(parseCurrencyInput('1500000')).toBe(1500000);
  });

  it('tolera un separador sin decimales', () => {
    expect(parseCurrencyInput('142,')).toBe(142);
  });

  it('devuelve 0 para valores vacíos o inválidos', () => {
    expect(parseCurrencyInput('')).toBe(0);
    expect(parseCurrencyInput('abc')).toBe(0);
  });
});

describe('roundCurrency', () => {
  it('redondea a dos decimales', () => {
    expect(roundCurrency(142.856)).toBe(142.86);
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });
});

describe('toCurrencyInputValue', () => {
  it('quita los decimales sobrantes que llegan de la API', () => {
    expect(toCurrencyInputValue('1500.00')).toBe('1500');
    expect(toCurrencyInputValue('142.85')).toBe('142.85');
    expect(toCurrencyInputValue(null)).toBe('');
  });
});
