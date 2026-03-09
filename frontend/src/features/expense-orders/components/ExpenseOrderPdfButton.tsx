import React from 'react';
import {
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import type { ExpenseOrder } from '../../../types/expense-order.types';
import { generateExpenseOrderPdf } from '../utils/generateExpenseOrderPdf';
import { ToolbarButton } from '../../orders/components/ToolbarButton';

interface ExpenseOrderPdfButtonProps {
  expenseOrder: ExpenseOrder;
  showPrint?: boolean;
}

export const ExpenseOrderPdfButton: React.FC<ExpenseOrderPdfButtonProps> = ({
  expenseOrder,
  showPrint = true,
}) => {
  const handleDownload = async () => {
    const doc = await generateExpenseOrderPdf(expenseOrder);
    doc.save(`OG_${expenseOrder.ogNumber}.pdf`);
  };

  const handlePrint = async () => {
    const doc = await generateExpenseOrderPdf(expenseOrder);
    const url = doc.output('bloburl');
    const win = window.open(url);
    if (win) {
      win.onload = () => {
        win.print();
      };
    }
  };

  return (
    <>
      <ToolbarButton
        icon={<PdfIcon />}
        label="PDF OG"
        onClick={handleDownload}
        tooltip="Descargar PDF Orden de Gasto"
      />
      {showPrint && (
        <ToolbarButton
          icon={<PrintIcon />}
          label="Imprimir"
          onClick={handlePrint}
          tooltip="Imprimir Orden de Gasto"
        />
      )}
    </>
  );
};
