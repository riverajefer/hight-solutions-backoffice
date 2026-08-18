import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { exportToExcel, type ExportColumn } from './excelExport';

// `writeFile` escribiría un archivo real (en jsdom, dispara una descarga). Se
// reemplaza a nivel de módulo porque los exports de `xlsx` no son configurables
// y `vi.spyOn` no puede redefinirlos.
vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return { ...actual, writeFile: vi.fn() };
});

interface Row {
  name: string;
  amount: number;
  url?: string;
}

const columns: ExportColumn<Row>[] = [
  { key: 'name', label: 'Nombre', defaultVisible: true, getValue: (r) => r.name },
  {
    key: 'amount',
    label: 'Monto',
    defaultVisible: true,
    numeric: true,
    getValue: (r) => r.amount,
  },
  {
    key: 'link',
    label: 'Soporte',
    defaultVisible: true,
    getValue: (r) => (r.url ? 'Ver soporte' : 'Sin soporte'),
    hyperlink: (r) => r.url,
  },
];

/** Captura el libro que `exportToExcel` manda a escribir, sin tocar el disco. */
const captureWorkbook = (rows: Row[]): XLSX.WorkBook => {
  exportToExcel(rows, columns, 'test.xlsx', 'Datos');
  const { calls } = vi.mocked(XLSX.writeFile).mock;
  return calls[calls.length - 1][0] as XLSX.WorkBook;
};

beforeEach(() => {
  vi.mocked(XLSX.writeFile).mockClear();
});

describe('exportToExcel — hipervínculos', () => {
  it('marca como hipervínculo solo las celdas con URL', () => {
    const wb = captureWorkbook([
      { name: 'Con soporte', amount: 100, url: 'https://s3.example.com/a?sig=1' },
      { name: 'Sin soporte', amount: 200 },
    ]);
    const ws = wb.Sheets['Datos'];

    // Fila 0 es el encabezado; la columna «Soporte» es la tercera (índice 2).
    expect(ws['C2'].l).toEqual({
      Target: 'https://s3.example.com/a?sig=1',
      Tooltip: 'Soporte',
    });
    expect(ws['C3'].l).toBeUndefined();
  });

  it('deja el texto visible corto y guarda la URL larga en el enlace', () => {
    const url = `https://s3.example.com/x?${'a'.repeat(500)}`;
    const ws = captureWorkbook([{ name: 'x', amount: 1, url }]).Sheets['Datos'];

    expect(ws['C2'].v).toBe('Ver soporte');
    expect(ws['C2'].l.Target).toBe(url);
  });

  it('no toca las columnas que no declaran hyperlink', () => {
    const ws = captureWorkbook([
      { name: 'x', amount: 1, url: 'https://s3.example.com/a' },
    ]).Sheets['Datos'];

    expect(ws['A2'].l).toBeUndefined();
    expect(ws['B2'].l).toBeUndefined();
  });

  it('no rompe la fila de TOTALES, que no tiene fila origen', () => {
    const ws = captureWorkbook([
      { name: 'a', amount: 100, url: 'https://s3.example.com/a' },
      { name: 'b', amount: 250, url: 'https://s3.example.com/b' },
    ]).Sheets['Datos'];

    // TOTALES queda en la fila 4 (encabezado + 2 datos + totales).
    expect(ws['A4'].v).toBe('TOTALES');
    expect(ws['B4'].v).toBe(350);
    expect(ws['C4']?.l).toBeUndefined();
  });
});
