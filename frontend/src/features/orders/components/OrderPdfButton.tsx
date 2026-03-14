import React from 'react';
import {
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import type { Order } from '../../../types/order.types';
import { generateOrderPdf } from '../utils/generateOrderPdf';
import { ToolbarButton } from './ToolbarButton';

interface OrderPdfButtonProps {
  order: Order;
  showPrint?: boolean;
}

export const OrderPdfButton: React.FC<OrderPdfButtonProps> = ({ order, showPrint = true }) => {
  const handleDownload = async () => {
    const doc = await generateOrderPdf(order);
    doc.save(`Orden_${order.orderNumber}.pdf`);
  };

  const handlePrint = async () => {
    const doc = await generateOrderPdf(order);
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
        label="PDF"
        onClick={handleDownload}
        tooltip="Descargar PDF"
      />
      {showPrint && (
        <ToolbarButton
          icon={<PrintIcon />}
          label="Imprimir"
          onClick={handlePrint}
          tooltip="Imprimir Orden"
        />
      )}
    </>
  );
};
