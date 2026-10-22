import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import { useSnackbar } from 'notistack';

interface BackupCodesPanelProps {
  codes: string[];
  username?: string | null;
  /** Texto del botón final; se habilita al marcar que ya los guardó. */
  continueLabel: string;
  onContinue: () => void;
}

const fileHeader = (username?: string | null) =>
  [
    'High Solutions CRM — códigos de respaldo del doble factor',
    username ? `Usuario: ${username}` : null,
    `Generados: ${new Date().toLocaleString('es-CO')}`,
    'Cada código sirve una sola vez. Guárdalos fuera del celular.',
  ]
    .filter(Boolean)
    .join('\n');

/**
 * Muestra los códigos de respaldo una sola vez: el backend no los vuelve a
 * entregar. Por eso exige marcar que ya los guardó antes de continuar.
 */
export const BackupCodesPanel: React.FC<BackupCodesPanelProps> = ({
  codes,
  username,
  continueLabel,
  onContinue,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [saved, setSaved] = useState(false);
  const text = `${fileHeader(username)}\n\n${codes.join('\n')}\n`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      enqueueSnackbar('Códigos copiados', { variant: 'success' });
    } catch {
      enqueueSnackbar('No se pudieron copiar; descárgalos o imprímelos', { variant: 'warning' });
    }
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'codigos-respaldo-high-solutions.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=480,height=640');
    if (!win) {
      enqueueSnackbar('El navegador bloqueó la ventana de impresión; descarga los códigos', {
        variant: 'warning',
      });
      return;
    }
    const pre = win.document.createElement('pre');
    pre.style.font = '16px/1.8 monospace';
    pre.textContent = text;
    win.document.title = 'Códigos de respaldo';
    win.document.body.appendChild(pre);
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Stack spacing={2}>
      <Alert severity="warning">
        Guarda estos códigos ahora: no se vuelven a mostrar. Cada uno te deja entrar una vez si
        pierdes o cambias el celular.
      </Alert>

      <Box
        component="ul"
        aria-label="Códigos de respaldo"
        sx={{
          listStyle: 'none',
          m: 0,
          p: 2,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1,
          borderRadius: 2,
          bgcolor: 'action.hover',
          fontFamily: 'monospace',
          fontSize: '1.05rem',
          textAlign: 'center',
          letterSpacing: 1,
        }}
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopy}>
          Copiar
        </Button>
        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
          Descargar
        </Button>
        <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
          Imprimir
        </Button>
      </Stack>

      <FormControlLabel
        control={<Checkbox checked={saved} onChange={(e) => setSaved(e.target.checked)} />}
        label={<Typography variant="body2">Ya guardé mis códigos de respaldo</Typography>}
      />

      <Button variant="contained" fullWidth disabled={!saved} onClick={onContinue}>
        {continueLabel}
      </Button>
    </Stack>
  );
};
