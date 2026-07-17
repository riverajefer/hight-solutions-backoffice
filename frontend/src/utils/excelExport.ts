import * as XLSX from 'xlsx';

/** Límite alto para traer todos los registros del rango sin paginar. */
export const EXPORT_LIMIT = 100000;

/**
 * Definición de una columna exportable a Excel. Cada columna sabe cómo obtener
 * su valor desde una fila y si es numérica (para la fila de totales).
 */
export interface ExportColumn<T> {
  /** Clave estable (se persiste en localStorage). */
  key: string;
  /** Encabezado en español para la hoja de Excel. */
  label: string;
  /** Si aparece marcada por defecto (espejo de las columnas visibles de la tabla). */
  defaultVisible: boolean;
  /** Si es numérica: el valor se exporta como número y se suma en la fila de totales. */
  numeric?: boolean;
  /** Obtiene el valor de la celda para una fila. */
  getValue: (row: T) => string | number;
}

/**
 * Genera y descarga un archivo .xlsx con las filas recibidas, usando solo las
 * columnas seleccionadas. Agrega una fila final de TOTALES con la suma de las
 * columnas numéricas. Los valores numéricos se exportan como número (no string)
 * para que las sumas/filtros nativos de Excel funcionen.
 */
export function exportToExcel<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  fileName: string,
  sheetName = 'Datos',
): void {
  const headers = columns.map((c) => c.label);

  const sheetRows: (string | number)[][] = rows.map((row) =>
    columns.map((c) => c.getValue(row)),
  );

  // Fila de totales: suma solo las columnas numéricas
  const hasNumeric = columns.some((c) => c.numeric);
  if (hasNumeric && rows.length > 0) {
    const totalsRow = columns.map((c, idx) => {
      if (idx === 0) return 'TOTALES';
      if (!c.numeric) return '';
      return rows.reduce((sum, row) => {
        const value = c.getValue(row);
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    });
    sheetRows.push(totalsRow);
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sheetRows]);

  // Ancho de columnas aproximado según el encabezado
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(12, c.label.length + 2) }));

  const wb = XLSX.utils.book_new();
  // Excel limita el nombre de hoja a 31 caracteres
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName);
}
