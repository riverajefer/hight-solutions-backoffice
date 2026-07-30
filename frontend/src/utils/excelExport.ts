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
 * Hoja de detalle opcional para relaciones uno-a-muchos (ej. una Orden de Gasto
 * y sus ítems). Cada fila padre se "expande" en sus filas hijo mediante `explode`
 * y el resultado se escribe en una hoja aparte, preservando la relación con una
 * columna de enlace (ej. Nº OG repetido).
 */
export interface DetailSheet<Parent, Child> {
  /** Nombre de la hoja de detalle en el libro. */
  sheetName: string;
  /** Columnas de la hoja de detalle (mismo patrón que las principales). */
  columns: ExportColumn<Child>[];
  /** Expande una fila padre en sus filas hijo (ej. una OG en sus ítems). */
  explode: (parent: Parent) => Child[];
}

/** Construye una hoja (con fila de TOTALES si hay columnas numéricas). */
function buildSheet<R>(rows: R[], columns: ExportColumn<R>[]): XLSX.WorkSheet {
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
  return ws;
}

/**
 * Genera y descarga un archivo .xlsx con las filas recibidas, usando solo las
 * columnas seleccionadas. Agrega una fila final de TOTALES con la suma de las
 * columnas numéricas. Los valores numéricos se exportan como número (no string)
 * para que las sumas/filtros nativos de Excel funcionen.
 *
 * Si se pasa `detailSheet`, agrega una segunda hoja con una fila por cada hijo
 * (ej. una fila por ítem de gasto), útil para relaciones uno-a-muchos.
 */
export function exportToExcel<T, C = unknown>(
  rows: T[],
  columns: ExportColumn<T>[],
  fileName: string,
  sheetName = 'Datos',
  detailSheet?: DetailSheet<T, C>,
): void {
  const wb = XLSX.utils.book_new();

  // Excel limita el nombre de hoja a 31 caracteres
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(rows, columns),
    sheetName.slice(0, 31),
  );

  if (detailSheet) {
    const childRows = rows.flatMap((row) => detailSheet.explode(row));
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet(childRows, detailSheet.columns),
      detailSheet.sheetName.slice(0, 31),
    );
  }

  XLSX.writeFile(wb, fileName);
}
