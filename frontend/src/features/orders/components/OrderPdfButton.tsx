import React from 'react';
import { Button, IconButton, Tooltip, useTheme, useMediaQuery } from '@mui/material';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  if (isMobile) {
    return (
      <>
        <Tooltip title="PDF">
          <IconButton
            color="primary"
            onClick={handleDownload}
            size="small"
            sx={{
              bgcolor: 'action.hover',
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <PdfIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Imprimir">
          <IconButton
            color="primary"
            onClick={handlePrint}
            size="small"
            sx={{
              bgcolor: 'action.hover',
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <PrintIcon />
          </IconButton>
        </Tooltip>
      </>
    );
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<PdfIcon />}
        onClick={handleDownload}
        size="medium"
        sx={{ minWidth: { sm: 'auto', md: 120 } }}
      >
        PDF
      </Button>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={handlePrint}
        size="medium"
        sx={{ minWidth: { sm: 'auto', md: 120 } }}
      >
        Imprimir
      </Button>
    </>
  );
};
