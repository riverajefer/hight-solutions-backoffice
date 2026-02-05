import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { UploadClientsResponse } from '../../../types';

interface UploadCsvModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<UploadClientsResponse>;
}

const TEMPLATE_HEADERS = [
  'name',
  'email',
  'phone',
  'personType',
  'department',
  'city',
  'nit',
  'cedula',
  'manager',
  'encargado',
  'landlinePhone',
  'address',
];

const PREVIEW_COLUMNS = ['name', 'email', 'phone', 'personType', 'department', 'city'];

export const UploadCsvModal: React.FC<UploadCsvModalProps> = ({
  open,
  onClose,
  onUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadClientsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setPreviewRows([]);
      setHeaders([]);
      setResult(null);
      setError(null);
    }
  }, [open]);

  // Core logic: validate file and load preview
  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Solo se permiten archivos CSV (.csv)');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('El archivo no puede exceder 1 MB');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (lines.length < 2) {
        setError('El CSV debe tener al menos una cabecera y una fila de datos');
        setSelectedFile(null);
        return;
      }

      const parsedHeaders = lines[0]
        .split(',')
        .map((h) => h.trim().replace(/^["']|["']$/g, ''));
      setHeaders(parsedHeaders);

      const dataLines = lines.slice(1, 11);
      const rows = dataLines.map((line) =>
        line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, '')),
      );
      setPreviewRows(rows);
    };
    reader.readAsText(file);
  };

  // Click → file input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const response = await onUpload(selectedFile);
      setResult(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const rows = [
      TEMPLATE_HEADERS.join(','),
      'Empresa Ejemplo S.A.S.,empresa@ejemplo.com,3001234567,EMPRESA,Antioquia,Medellín,900123456-7,,Juan Pérez,María López,6012345678,"Calle 10 #20-30"',
      'Pedro Pérez,pedro@ejemplo.com,3109876543,NATURAL,Cundinamarca,Bogotá,,1234567890,,,,"Carrera 40 #50-60"',
    ];
    const csvContent = rows.join('\n') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_clientes.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const previewColIndices = PREVIEW_COLUMNS.map((col) =>
    headers.indexOf(col),
  ).filter((i) => i >= 0);
  const previewColNames = previewColIndices.map((i) => headers[i]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadFileIcon color="primary" />
          <Typography variant="h6">Subida Masiva de Clientes</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Template download — always visible */}
        <Box sx={{ mb: 2 }}>
          <Tooltip title="Descarga una plantilla CSV con las columnas correctas">
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
              color="secondary"
            >
              Descargar plantilla CSV
            </Button>
          </Tooltip>
        </Box>

        {/* File selection area (hidden once result is shown) */}
        {!result && (
          <>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: isDragOver ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: isDragOver ? 'action.hover' : 'transparent',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover',
                },
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <UploadFileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" color="textSecondary">
                Arrastra y suelta un archivo CSV aquí o haz clic para seleccionar
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                Máximo 1 MB · Solo archivos .csv
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </Box>

            {/* Validation error */}
            {error && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorIcon color="error" fontSize="small" />
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              </Box>
            )}

            {/* Preview table */}
            {previewRows.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Vista previa ({previewRows.length} fila
                  {previewRows.length !== 1 ? 's' : ''} mostradas
                  {previewRows.length === 10 ? ' — puede haber más' : ''})
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 40 }}>#</TableCell>
                        {previewColNames.map((col) => (
                          <TableCell key={col}>{col}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 2}</TableCell>
                          {previewColIndices.map((colIdx) => (
                            <TableCell key={colIdx}>{row[colIdx] || '-'}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}

        {/* Result display (after upload) */}
        {result && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`${result.successful} exitoso${result.successful !== 1 ? 's' : ''}`}
                color="success"
                variant="outlined"
              />
              <Chip
                icon={result.failed > 0 ? <ErrorIcon /> : undefined}
                label={`${result.failed} fallido${result.failed !== 1 ? 's' : ''}`}
                color={result.failed > 0 ? 'error' : 'default'}
                variant="outlined"
              />
              <Chip label={`${result.total} total`} variant="outlined" />
            </Box>

            {result.errors.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Errores por fila:
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fila</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.errors.map((err) => (
                        <TableRow key={err.row}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="error">
                              {err.error}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isUploading}>
          {result ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!result && selectedFile && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={isUploading}
            startIcon={
              isUploading ? <CircularProgress size={18} /> : <UploadFileIcon />
            }
          >
            {isUploading ? 'Subiendo...' : 'Subir Clientes'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
