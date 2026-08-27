import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { exportOrderTrackingToExcel } from './exportOrderTracking';
import type { AdvisorTrackingRow } from '../../../types/order.types';

// `writeFile` toca el disco/navegador: lo interceptamos y nos quedamos con el libro.
vi.mock('xlsx', async () => {
  const actual = await vi.importActual<typeof XLSX>('xlsx');
  return { ...actual, writeFile: vi.fn() };
});

const row = (o: Partial<AdvisorTrackingRow>): AdvisorTrackingRow => ({
  advisorId: 'a1',
  advisorName: 'Laura Maldonado',
  status: 'CONFIRMED',
  paid: true,
  count: 1,
  netAmount: 1000,
  pendingBalance: 0,
  ...o,
});

const rows: AdvisorTrackingRow[] = [
  row({ status: 'CONFIRMED', paid: true, count: 4, netAmount: 400_000 }),
  row({ status: 'DELIVERED', paid: true, count: 1, netAmount: 100_000 }),
  row({ status: 'DRAFT', paid: false, count: 9, netAmount: 900_000, pendingBalance: 500_000 }),
];

/** `Array.prototype.at` no está en el lib target del proyecto. */
const last = <T,>(arr: T[], fromEnd = 1): T => arr[arr.length - fromEnd];

const exportar = (over: Partial<Parameters<typeof exportOrderTrackingToExcel>[0]> = {}) => {
  exportOrderTrackingToExcel({
    rows,
    month: 8,
    year: 2026,
    paidMode: 'all',
    scopedToOwn: false,
    ...over,
  });
  const calls = (XLSX.writeFile as unknown as ReturnType<typeof vi.fn>).mock.calls;
  const [wb, fileName] = last(calls);
  return { wb: wb as XLSX.WorkBook, fileName: fileName as string };
};

/** Celdas de una hoja como matriz cruda. */
const aoa = (wb: XLSX.WorkBook, sheet: string) =>
  XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, blankrows: true });

beforeEach(() => vi.clearAllMocks());

describe('exportOrderTrackingToExcel', () => {
  it('genera una hoja de resumen y una por cada medida', () => {
    const { wb } = exportar();
    expect(wb.SheetNames).toEqual(['Resumen', 'N.º de OP', 'Monto neto', 'Saldo pendiente']);
  });

  it('nombra el archivo con el mes y el año consultados', () => {
    expect(exportar({ month: 1, year: 2027 }).fileName).toBe('Seguimiento_OP_2027-01.xlsx');
  });

  it('escribe los valores como números, no como texto formateado', () => {
    const filas = aoa(exportar().wb, 'Monto neto');
    const encabezado = filas.findIndex((f) => f[0] === 'Asesor');
    const fila = filas[encabezado + 1];

    expect(fila[0]).toBe('Laura Maldonado');
    expect(fila.slice(1).every((v) => typeof v === 'number')).toBe(true);
    expect(last(fila)).toBe(400_000); // brecha en monto
  });

  it('cierra cada hoja con la fila de total general', () => {
    const filas = aoa(exportar().wb, 'N.º de OP');
    const total = last(filas);

    expect(total[0]).toBe('Total general');
    // 4 confirmadas + 1 entregada + 9 borradores
    expect(last(total, 3)).toBe(14);
    expect(last(total, 2)).toBe(4); // brecha en OP
  });

  it('no suma las anuladas en el total general ni en el resumen', () => {
    const conAnulada = [
      ...rows,
      row({ status: 'ANULADO', paid: false, count: 2, netAmount: 166_600, pendingBalance: 106_600 }),
    ];

    const matriz = last(aoa(exportar({ rows: conAnulada }).wb, 'N.º de OP'));
    expect(last(matriz, 3)).toBe(14); // las 2 anuladas quedan fuera del total

    const resumen = aoa(exportar({ rows: conAnulada }).wb, 'Resumen');
    const porNombre = (n: string) => resumen.find((f) => String(f[0]).startsWith(n));

    expect(porNombre('OP del mes')).toEqual(['OP del mes (sin anuladas)', 14, 1_400_000]);
    expect(porNombre('Anuladas')).toEqual(['Anuladas (no suman)', 2, '']);
    // El saldo de una anulada no es cartera por cobrar.
    expect(porNombre('Saldo pendiente')).toEqual(['Saldo pendiente por cobrar', '', 500_000]);
  });

  it('deja constancia del corte de pago y del alcance', () => {
    const propias = aoa(exportar({ paidMode: 'paid', scopedToOwn: true }).wb, 'N.º de OP');
    const texto = propias.flat().join(' | ');

    expect(texto).toContain('solo las pagadas al 100%');
    expect(texto).toContain('Alcance: solo tus propias OP');

    const equipo = aoa(exportar({ scopedToOwn: false }).wb, 'N.º de OP').flat().join(' | ');
    expect(equipo).toContain('Alcance: todos los asesores');
  });

  it('el corte de pago afecta las medidas pero no la brecha', () => {
    const soloPagadas = aoa(exportar({ paidMode: 'paid' }).wb, 'N.º de OP');
    const total = last(soloPagadas);

    expect(last(total, 3)).toBe(5); // sin los 9 borradores con saldo
    expect(last(total, 2)).toBe(4); // la brecha no cambia
  });

  it('el resumen trae los indicadores de la cabecera', () => {
    const filas = aoa(exportar().wb, 'Resumen');
    const porNombre = (nombre: string) => filas.find((f) => String(f[0]).startsWith(nombre));

    expect(porNombre('OP del mes')).toEqual(['OP del mes (sin anuladas)', 14, 1_400_000]);
    expect(porNombre('Pagadas al 100%')).toEqual(['Pagadas al 100%', 5, 500_000]);
    expect(porNombre('Listas para comisión')).toEqual([
      'Listas para comisión (entregadas + pagadas)', 1, 100_000,
    ]);
    expect(porNombre('Brecha')).toEqual(['Brecha (pagadas sin marcar entrega)', 4, 400_000]);
  });
});
