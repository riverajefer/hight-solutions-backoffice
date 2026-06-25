import * as XLSX from 'xlsx';
import type { Order } from '../../../types/order.types';
import type { OrderExportColumn } from './orderExportColumns';

/**
 * Genera y descarga un archivo .xlsx con las órdenes recibidas, usando solo las
 * columnas seleccionadas. Agrega una fila final de TOTALES con la suma de las
 * columnas numéricas. Los valores numéricos se exportan como número (no string)
 * para que las sumas/filtros nativos de Excel funcionen.
 */
export function exportOrdersToExcel(
  orders: Order[],
  columns: OrderExportColumn[],
  fileName: string,
): void {
  const headers = columns.map((c) => c.label);

  const rows = orders.map((order) => columns.map((c) => c.getValue(order)));

  // Fila de totales: suma solo las columnas numéricas
  const hasNumeric = columns.some((c) => c.numeric);
  if (hasNumeric && orders.length > 0) {
    const totalsRow = columns.map((c, idx) => {
      if (idx === 0) return 'TOTALES';
      if (!c.numeric) return '';
      return orders.reduce((sum, order) => {
        const value = c.getValue(order);
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    });
    rows.push(totalsRow);
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Ancho de columnas aproximado según el encabezado
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(12, c.label.length + 2) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Órdenes de Pedido');
  XLSX.writeFile(wb, fileName);
}
