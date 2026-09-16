import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  clampPageSize,
  MAX_PAGE_SIZE,
  MAX_REPORT_PAGE_SIZE,
} from './pagination.dto';
import { FilterOrdersDto } from '../../modules/orders/dto/filter-orders.dto';
import { FilterQuotesDto } from '../../modules/quotes/dto/filter-quotes.dto';

describe('clampPageSize', () => {
  it('respeta un tamaño de página normal', () => {
    expect(clampPageSize(50)).toBe(50);
  });

  it('acota el tope: `?limit=100000` ya no se lleva la tabla entera', () => {
    expect(clampPageSize(100000)).toBe(MAX_PAGE_SIZE);
  });

  it('acepta el tope exacto', () => {
    expect(clampPageSize(MAX_PAGE_SIZE)).toBe(MAX_PAGE_SIZE);
  });

  it('usa el valor por defecto cuando no llega límite', () => {
    expect(clampPageSize(undefined, 20)).toBe(20);
  });

  it('nunca devuelve menos de una fila', () => {
    expect(clampPageSize(0, 20)).toBe(20);
    expect(clampPageSize(-5, 20)).toBe(20);
  });

  it('descarta valores que no son números', () => {
    expect(clampPageSize(NaN, 25)).toBe(25);
    expect(clampPageSize('abc' as unknown as number, 25)).toBe(25);
  });

  it('trunca los decimales: Prisma espera un entero', () => {
    expect(clampPageSize(10.7)).toBe(10);
  });

  it('acota también el valor por defecto si excede el tope', () => {
    expect(clampPageSize(undefined, 5000)).toBe(MAX_PAGE_SIZE);
  });

  it('admite un tope mayor para los listados que alimentan reportes', () => {
    expect(clampPageSize(1000, 20, MAX_REPORT_PAGE_SIZE)).toBe(1000);
    expect(clampPageSize(100000, 20, MAX_REPORT_PAGE_SIZE)).toBe(
      MAX_REPORT_PAGE_SIZE,
    );
  });
});

/**
 * El clamp del repositorio es la segunda línea de defensa; la primera es la
 * validación del DTO, que es la que devuelve un 400 legible en vez de recortar
 * en silencio.
 */
describe('tope de `limit` en los filtros', () => {
  const limitErrors = (dto: object) =>
    validateSync(dto).filter((e) => e.property === 'limit');

  it('rechaza el límite desbordado en cotizaciones', () => {
    const dto = plainToInstance(FilterQuotesDto, { limit: '100000' });
    const errors = limitErrors(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('max');
  });

  it('acepta el tope exacto en cotizaciones', () => {
    const dto = plainToInstance(FilterQuotesDto, { limit: String(MAX_PAGE_SIZE) });

    expect(limitErrors(dto)).toHaveLength(0);
  });

  // Órdenes lleva un techo más alto porque dos pantallas se traen 500 y 1.000
  // filas para filtrar del lado del cliente (hallazgo 13).
  it('permite 1.000 en órdenes pero no más', () => {
    expect(
      limitErrors(plainToInstance(FilterOrdersDto, { limit: '1000' })),
    ).toHaveLength(0);
    expect(
      limitErrors(plainToInstance(FilterOrdersDto, { limit: '1001' })),
    ).toHaveLength(1);
  });
});
