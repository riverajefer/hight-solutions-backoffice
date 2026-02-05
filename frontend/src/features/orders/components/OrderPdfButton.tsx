import React, { useState } from 'react';
import {
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import type { Order } from '../../../types/order.types';
import { generateOrderPdf } from '../utils/generateOrderPdf';

interface OrderPdfButtonProps {
  order: Order;
}

export const OrderPdfButton: React.FC<OrderPdfButtonProps> = ({ order }) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleDownload = () => {
    const doc = generateOrderPdf(order);
    doc.save(`Orden_${order.orderNumber}.pdf`);
    setMenuAnchor(null);
  };

  const handlePrint = () => {
    const doc = generateOrderPdf(order);
    const url = doc.output('bloburl');
    const win = window.open(url);
    if (win) {
      win.onload = () => {
        win.print();
      };
    }
    setMenuAnchor(null);
  };

  return (
    <>
      <ButtonGroup variant="outlined">
        <Button startIcon={<PdfIcon />} onClick={handleDownload}>
          PDF
        </Button>
        <Button size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleDownload}>
          <ListItemIcon>
            <DownloadIcon />
          </ListItemIcon>
          <ListItemText>Descargar PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={handlePrint}>
          <ListItemIcon>
            <PrintIcon />
          </ListItemIcon>
          <ListItemText>Imprimir</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
