import React from 'react';
import { Button } from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import type { Order } from '../../../types/order.types';
import { generateOrderPdf } from '../utils/generateOrderPdf';

interface OrderPdfButtonProps {
  order: Order;
}

export const OrderPdfButton: React.FC<OrderPdfButtonProps> = ({ order }) => {
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
      <Button
        variant="outlined"
        startIcon={<PdfIcon />}
        onClick={handleDownload}
      >
        Descargar PDF
      </Button>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={handlePrint}
      >
        Imprimir
      </Button>
    </>
  );
};
