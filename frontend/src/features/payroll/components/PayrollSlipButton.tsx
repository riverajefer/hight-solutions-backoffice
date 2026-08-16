import React, { useState } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import {
  ReceiptLong as ReceiptLongIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import type { PayrollItem } from '../../../types/payroll-item.types';
import {
  generatePayrollSlipPdf,
  payrollSlipFileName,
  type SlipPeriod,
} from '../utils/generatePayrollSlipPdf';
import { ToolbarButton } from '../../orders/components/ToolbarButton';

interface PayrollSlipButtonProps {
  item: PayrollItem;
  period: SlipPeriod;
  /** `icon` para usar dentro de tablas; `toolbar` para barras de acciones. */
  variant?: 'icon' | 'toolbar';
  /** Solo aplica a la variante `toolbar`. */
  showPrint?: boolean;
}

export const PayrollSlipButton: React.FC<PayrollSlipButtonProps> = ({
  item,
  period,
  variant = 'icon',
  showPrint = true,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);

  const run = async (action: (doc: Awaited<ReturnType<typeof generatePayrollSlipPdf>>) => void) => {
    setBusy(true);
    try {
      const doc = await generatePayrollSlipPdf(item, period);
      action(doc);
    } catch (error) {
      console.error('Error generando el desprendible de nómina', error);
      enqueueSnackbar('No se pudo generar el desprendible', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () =>
    run((doc) => doc.save(payrollSlipFileName(item, period)));

  const handlePrint = () =>
    run((doc) => {
      const url = doc.output('bloburl');
      const win = window.open(url);
      if (win) {
        win.onload = () => win.print();
      }
    });

  if (variant === 'toolbar') {
    return (
      <>
        <ToolbarButton
          icon={busy ? <CircularProgress size={18} /> : <ReceiptLongIcon />}
          label="Desprendible"
          onClick={handleDownload}
          disabled={busy}
          tooltip="Descargar desprendible de nómina"
        />
        {showPrint && (
          <ToolbarButton
            icon={<PrintIcon />}
            label="Imprimir"
            onClick={handlePrint}
            disabled={busy}
            tooltip="Imprimir desprendible de nómina"
          />
        )}
      </>
    );
  }

  return (
    <Tooltip title="Descargar desprendible de nómina">
      <span>
        <IconButton
          size="small"
          onClick={handleDownload}
          disabled={busy}
          aria-label="Descargar desprendible de nómina"
        >
          {busy ? <CircularProgress size={18} /> : <ReceiptLongIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
};
