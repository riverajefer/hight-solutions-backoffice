import jsPDF from 'jspdf';
import type { Order } from '../../../types/order.types';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  COMPANY_INFO,
  PDF_COLORS,
  PDF_FONTS,
  PDF_LAYOUT,
} from '../../../utils/pdfConstants';

/** Get string width in mm (jsPDF v4: getStringUnitWidth returns points) */
function strWidthMm(doc: jsPDF, text: string): number {
  return doc.getStringUnitWidth(text) / doc.internal.scaleFactor;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setTextColor(doc: jsPDF, color: readonly number[]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setFillColor(doc: jsPDF, color: readonly number[]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDrawColor(doc: jsPDF, color: readonly number[]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

/** Calculate how many lines a text will occupy given a max width in mm */
function calcLineCount(doc: jsPDF, text: string, maxWidth: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  return lines.length;
}

/** Draw footer on a given page (1-indexed) */
function drawFooterOnPage(doc: jsPDF, pageIndex: number) {
  const totalPages = doc.getNumberOfPages();
  doc.setPage(pageIndex);

  // Separator line above footer
  const sepY = PDF_LAYOUT.pageHeight - PDF_LAYOUT.marginBottom - 4;
  setDrawColor(doc, PDF_COLORS.borderGray);
  doc.setLineWidth(0.2);
  doc.line(PDF_LAYOUT.marginLeft, sepY, PDF_LAYOUT.marginLeft + PDF_LAYOUT.contentWidth, sepY);

  doc.setFontSize(PDF_FONTS.footer);
  setTextColor(doc, PDF_COLORS.footerText);
  doc.setFont('helvetica', 'normal');

  const footerLine1 = `${COMPANY_INFO.address}, ${COMPANY_INFO.city}`;
  const footerLine2 = `Tel: ${COMPANY_INFO.phones.join(' / ')}  |  ${COMPANY_INFO.email}`;
  const footerLine3 = `Página ${pageIndex} de ${totalPages}`;

  doc.text(footerLine1, PDF_LAYOUT.pageWidth / 2, sepY + 4, { align: 'center' });
  doc.text(footerLine2, PDF_LAYOUT.pageWidth / 2, sepY + 8, { align: 'center' });
  doc.text(footerLine3, PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginRight, sepY + 8, { align: 'right' });
}

// ---------------------------------------------------------------------------
// Section drawers — each receives (doc, y) and returns the new y
// ---------------------------------------------------------------------------

function drawHeader(doc: jsPDF): number {
  // Dark navy background bar
  setFillColor(doc, PDF_COLORS.headerBg);
  doc.rect(0, 0, PDF_LAYOUT.pageWidth, PDF_LAYOUT.headerHeight, 'F');

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_FONTS.headerCompany);
  setTextColor(doc, PDF_COLORS.headerText);
  doc.text(COMPANY_INFO.name.toUpperCase(), PDF_LAYOUT.marginLeft, 14);

  // Document title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_FONTS.headerDocTitle);
  doc.text('Orden de Pedido', PDF_LAYOUT.marginLeft, 23);

  // Contact line inside header
  doc.setFontSize(PDF_FONTS.footer);
  const contactLine = `${COMPANY_INFO.address}, ${COMPANY_INFO.city}  |  Tel: ${COMPANY_INFO.phones.join(' / ')}  |  ${COMPANY_INFO.email}`;
  doc.text(contactLine, PDF_LAYOUT.pageWidth / 2, PDF_LAYOUT.headerHeight - 4, { align: 'center' });

  return PDF_LAYOUT.headerHeight + 6;
}

function drawOrderInfo(doc: jsPDF, y: number, order: Order): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_FONTS.label);
  setTextColor(doc, PDF_COLORS.sectionTitleText);

  // Left column labels
  doc.text('Orden:', PDF_LAYOUT.marginLeft, y);
  doc.text('Fecha Orden:', PDF_LAYOUT.marginLeft, y + 5);

  // Left column values
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_FONTS.value);
  setTextColor(doc, PDF_COLORS.bodyText);
  doc.text(order.orderNumber, PDF_LAYOUT.marginLeft + 30, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(order.orderDate), PDF_LAYOUT.marginLeft + 30, y + 5);

  // Right column labels
  const rightLabelX = PDF_LAYOUT.marginLeft + 100;
  doc.setFontSize(PDF_FONTS.label);
  setTextColor(doc, PDF_COLORS.sectionTitleText);
  doc.text('Fecha Generación:', rightLabelX, y);
  if (order.deliveryDate) {
    doc.text('Fecha Entrega:', rightLabelX, y + 5);
  }

  // Right column values
  doc.setFontSize(PDF_FONTS.value);
  setTextColor(doc, PDF_COLORS.bodyText);
  doc.text(formatDate(new Date()), rightLabelX + 38, y);
  if (order.deliveryDate) {
    doc.text(formatDate(order.deliveryDate), rightLabelX + 38, y + 5);
  }

  return y + 14;
}

function drawClientSection(doc: jsPDF, y: number, order: Order): number {
  // Thin teal separator
  setDrawColor(doc, PDF_COLORS.tableHeaderBg);
  doc.setLineWidth(0.4);
  doc.line(PDF_LAYOUT.marginLeft, y, PDF_LAYOUT.marginLeft + PDF_LAYOUT.contentWidth, y);

  y += 4;

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_FONTS.sectionTitle);
  setTextColor(doc, PDF_COLORS.sectionTitleText);
  doc.text('Cliente', PDF_LAYOUT.marginLeft, y);

  y += 5;

  // Client name (bold)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_FONTS.value);
  setTextColor(doc, PDF_COLORS.bodyText);
  doc.text(order.client.name, PDF_LAYOUT.marginLeft, y);
  y += 4.5;

  // Email / Phone (normal, optional)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_FONTS.label);
  if (order.client.email) {
    doc.text(order.client.email, PDF_LAYOUT.marginLeft, y);
    y += 4;
  }
  if (order.client.phone) {
    doc.text(order.client.phone, PDF_LAYOUT.marginLeft, y);
    y += 4;
  }

  return y + 3;
}

function drawItemsTable(doc: jsPDF, y: number, order: Order): number {
  const colWidths = [20, 85, 37.5, 37.5]; // Cant | Descripción | Val. Unitario | Val. Total
  const colLabels = ['Cant.', 'Descripción', 'Val. Unitario', 'Val. Total'];
  const colAligns: ('center' | 'left' | 'right')[] = ['center', 'left', 'right', 'right'];
  const rowHeight = 6;
  const headerHeight = 7;
  const x0 = PDF_LAYOUT.marginLeft;

  const drawTableHeader = (atY: number) => {
    setFillColor(doc, PDF_COLORS.tableHeaderBg);
    doc.rect(x0, atY, PDF_LAYOUT.contentWidth, headerHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_FONTS.tableHeader);
    setTextColor(doc, PDF_COLORS.tableHeaderText);

    let cx = x0;
    colLabels.forEach((label, i) => {
      doc.text(label, cx + colWidths[i] / 2, atY + headerHeight * 0.6, { align: 'center' });
      cx += colWidths[i];
    });
  };

  drawTableHeader(y);
  y += headerHeight;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_FONTS.tableBody);

  order.items.forEach((item, idx) => {
    // Calculate required row height based on description wrapping
    const descLines = calcLineCount(doc, item.description, colWidths[1] - 4);
    const dynamicRowHeight = Math.max(rowHeight, descLines * 4 + 2);

    // Page break check
    if (y + dynamicRowHeight > PDF_LAYOUT.pageHeight - PDF_LAYOUT.marginBottom - 5) {
      doc.addPage();
      y = PDF_LAYOUT.marginTop;
      drawTableHeader(y);
      y += headerHeight;
    }

    // Row background
    const bgColor = idx % 2 === 0 ? [255, 255, 255] : [232, 244, 246];
    setFillColor(doc, bgColor);
    doc.rect(x0, y, PDF_LAYOUT.contentWidth, dynamicRowHeight, 'F');

    // Row border (bottom)
    setDrawColor(doc, PDF_COLORS.borderGray);
    doc.setLineWidth(0.2);
    doc.line(x0, y + dynamicRowHeight, x0 + PDF_LAYOUT.contentWidth, y + dynamicRowHeight);

    // Cell content
    setTextColor(doc, PDF_COLORS.bodyText);
    const textY = y + dynamicRowHeight * 0.5 + (strWidthMm(doc, 'M') * 0.35);

    const values = [
      String(item.quantity),
      item.description,
      formatCurrency(item.unitPrice),
      formatCurrency(item.total),
    ];

    let cx = x0;
    values.forEach((val, i) => {
      if (i === 1) {
        // Description: left-aligned with padding, support multi-line
        const lines = doc.splitTextToSize(val, colWidths[i] - 4);
        const lineH = 4;
        const blockH = lines.length * lineH;
        const startY = y + (dynamicRowHeight - blockH) / 2 + lineH * 0.7;
        lines.forEach((line: string, li: number) => {
          doc.text(line, cx + 2, startY + li * lineH);
        });
      } else {
        doc.text(val, cx + colWidths[i] / 2, textY, { align: colAligns[i] });
      }
      cx += colWidths[i];
    });

    y += dynamicRowHeight;
  });

  return y + 4;
}

function drawFinancials(doc: jsPDF, y: number, order: Order): number {
  // Right-aligned two-column block
  const labelX = PDF_LAYOUT.marginLeft + 95;
  const valueRight = PDF_LAYOUT.marginLeft + PDF_LAYOUT.contentWidth; // right edge for right-aligned values
  const lineH = 5.5;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_FONTS.totalLabel);
  setTextColor(doc, PDF_COLORS.bodyText);
  doc.text('Subtotal:', labelX, y);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(order.subtotal), valueRight, y, { align: 'right' });
  y += lineH;

  // IVA — only if tax > 0
  if (parseFloat(order.tax) > 0) {
    const rate = (parseFloat(order.taxRate) * 100).toFixed(1);
    doc.setFont('helvetica', 'normal');
    doc.text(`IVA (${rate}%):`, labelX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(order.tax), valueRight, y, { align: 'right' });
    y += lineH;
  }

  // Separator line
  setDrawColor(doc, PDF_COLORS.borderGray);
  doc.setLineWidth(0.3);
  doc.line(labelX, y + 1, valueRight, y + 1);
  y += 4;

  // Total (larger, bold)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_FONTS.totalValue);
  setTextColor(doc, PDF_COLORS.sectionTitleText);
  doc.text('Total:', labelX, y);
  doc.text(formatCurrency(order.total), valueRight, y, { align: 'right' });
  y += lineH + 1;

  // Abono
  doc.setFontSize(PDF_FONTS.totalLabel);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, PDF_COLORS.bodyText);
  doc.text('Abono:', labelX, y);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(order.paidAmount), valueRight, y, { align: 'right' });
  y += lineH;

  // Saldo
  doc.setFont('helvetica', 'normal');
  doc.text('Saldo:', labelX, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_FONTS.totalValue);
  doc.text(formatCurrency(order.balance), valueRight, y, { align: 'right' });
  y += lineH + 1;

  return y + 3;
}

function drawNotes(doc: jsPDF, y: number, order: Order): number {
  if (!order.notes) return y;

  // Separator
  setDrawColor(doc, PDF_COLORS.tableHeaderBg);
  doc.setLineWidth(0.4);
  doc.line(PDF_LAYOUT.marginLeft, y, PDF_LAYOUT.marginLeft + PDF_LAYOUT.contentWidth, y);
  y += 4;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_FONTS.sectionTitle);
  setTextColor(doc, PDF_COLORS.sectionTitleText);
  doc.text('Observaciones', PDF_LAYOUT.marginLeft, y);
  y += 5;

  // Text (wrapped)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_FONTS.tableBody);
  setTextColor(doc, PDF_COLORS.bodyText);
  const lines = doc.splitTextToSize(order.notes, PDF_LAYOUT.contentWidth);
  lines.forEach((line: string) => {
    if (y > PDF_LAYOUT.pageHeight - PDF_LAYOUT.marginBottom - 6) {
      doc.addPage();
      y = PDF_LAYOUT.marginTop;
    }
    doc.text(line, PDF_LAYOUT.marginLeft, y);
    y += 4;
  });

  return y + 3;
}

function drawAttendedBy(doc: jsPDF, y: number, order: Order): number {
  // Page-break guard: footer starts at pageHeight - marginBottom - 10
  if (y > PDF_LAYOUT.pageHeight - PDF_LAYOUT.marginBottom - 10) {
    doc.addPage();
    y = PDF_LAYOUT.marginTop;
  }

  const name =
    order.createdBy.firstName && order.createdBy.lastName
      ? `${order.createdBy.firstName} ${order.createdBy.lastName}`
      : order.createdBy.email;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_FONTS.label);
  setTextColor(doc, PDF_COLORS.bodyText);
  doc.text('Atendido por: ', PDF_LAYOUT.marginLeft, y);

  doc.setFont('helvetica', 'bold');
  doc.text(name, PDF_LAYOUT.marginLeft + strWidthMm(doc, 'Atendido por: '), y);

  return y + 6;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generateOrderPdf(order: Order): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawHeader(doc);
  y = drawOrderInfo(doc, y, order);
  y = drawClientSection(doc, y, order);
  y = drawItemsTable(doc, y, order);
  y = drawFinancials(doc, y, order);
  y = drawNotes(doc, y, order);
  drawAttendedBy(doc, y, order);

  // Draw footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    drawFooterOnPage(doc, i);
  }

  return doc;
}
