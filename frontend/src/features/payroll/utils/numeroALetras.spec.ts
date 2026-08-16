import { describe, it, expect } from 'vitest';
import { numeroALetras, pesosEnLetras } from './numeroALetras';

describe('numeroALetras', () => {
  it('convierte cero', () => {
    expect(numeroALetras(0)).toBe('CERO');
  });

  it('convierte unidades y la serie irregular hasta 29', () => {
    expect(numeroALetras(1)).toBe('UNO');
    expect(numeroALetras(15)).toBe('QUINCE');
    expect(numeroALetras(16)).toBe('DIECISÉIS');
    expect(numeroALetras(21)).toBe('VEINTIUNO');
    expect(numeroALetras(29)).toBe('VEINTINUEVE');
  });

  it('usa "Y" solo a partir de treinta', () => {
    expect(numeroALetras(30)).toBe('TREINTA');
    expect(numeroALetras(31)).toBe('TREINTA Y UNO');
    expect(numeroALetras(99)).toBe('NOVENTA Y NUEVE');
  });

  it('distingue CIEN de CIENTO', () => {
    expect(numeroALetras(100)).toBe('CIEN');
    expect(numeroALetras(101)).toBe('CIENTO UNO');
    expect(numeroALetras(115)).toBe('CIENTO QUINCE');
    expect(numeroALetras(200)).toBe('DOSCIENTOS');
    expect(numeroALetras(500)).toBe('QUINIENTOS');
  });

  it('dice MIL y no UN MIL', () => {
    expect(numeroALetras(1000)).toBe('MIL');
    expect(numeroALetras(1001)).toBe('MIL UNO');
    expect(numeroALetras(2000)).toBe('DOS MIL');
  });

  it('aplica el apócope antes de MIL y MILLONES', () => {
    expect(numeroALetras(21000)).toBe('VEINTIÚN MIL');
    expect(numeroALetras(21_000_000)).toBe('VEINTIÚN MILLONES');
    expect(numeroALetras(31_000)).toBe('TREINTA Y UN MIL');
  });

  it('distingue UN MILLÓN de MILLONES', () => {
    expect(numeroALetras(1_000_000)).toBe('UN MILLÓN');
    expect(numeroALetras(2_000_000)).toBe('DOS MILLONES');
  });

  it('convierte montos típicos de nómina', () => {
    expect(numeroALetras(834_000)).toBe('OCHOCIENTOS TREINTA Y CUATRO MIL');
    expect(numeroALetras(1_423_500)).toBe(
      'UN MILLÓN CUATROCIENTOS VEINTITRÉS MIL QUINIENTOS',
    );
  });

  it('redondea decimales y maneja negativos', () => {
    expect(numeroALetras(1500.4)).toBe('MIL QUINIENTOS');
    expect(numeroALetras(-50)).toBe('MENOS CINCUENTA');
  });
});

describe('pesosEnLetras', () => {
  it('agrega el sufijo de moneda', () => {
    expect(pesosEnLetras(834_000)).toBe(
      'OCHOCIENTOS TREINTA Y CUATRO MIL PESOS M/CTE',
    );
  });

  it('apocopa el UNO final antes de PESOS', () => {
    expect(pesosEnLetras(1)).toBe('UN PESOS M/CTE');
    expect(pesosEnLetras(21)).toBe('VEINTIÚN PESOS M/CTE');
    expect(pesosEnLetras(1_000_021)).toBe('UN MILLÓN VEINTIÚN PESOS M/CTE');
  });
});
