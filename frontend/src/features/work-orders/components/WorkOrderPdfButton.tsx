import React from 'react';
import {
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import type { WorkOrder } from '../../../types/work-order.types';
import { generateWorkOrderPdf } from '../utils/generateWorkOrderPdf';
import { ToolbarButton } from '../../orders/components/ToolbarButton';

interface WorkOrderPdfButtonProps {
  workOrder: WorkOrder;
  showPrint?: boolean;
}

export const WorkOrderPdfButton: React.FC<WorkOrderPdfButtonProps> = ({
  workOrder,
  showPrint = true,
}) => {
  const handleDownload = async () => {
    const doc = await generateWorkOrderPdf(workOrder);
    doc.save(`OT_${workOrder.workOrderNumber}.pdf`);
  };

  const handlePrint = async () => {
    const doc = await generateWorkOrderPdf(workOrder);
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
        label="PDF OT"
        onClick={handleDownload}
        tooltip="Descargar PDF Orden de Trabajo"
      />
      {showPrint && (
        <ToolbarButton
          icon={<PrintIcon />}
          label="Imprimir"
          onClick={handlePrint}
          tooltip="Imprimir Orden de Trabajo"
        />
      )}
    </>
  );
};
