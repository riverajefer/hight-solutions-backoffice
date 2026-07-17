import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  CircularProgress,
} from '@mui/material';
import { FileDownload as FileDownloadIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { useSnackbar } from 'notistack';
import { exportToExcel, type ExportColumn } from '../../utils/excelExport';

/** Rango de fechas ya normalizado a inicio y fin de día. */
export interface DateRange {
  from: Date;
  to: Date;
}

export interface ExportDialogProps<T> {
  open: boolean;
  onClose: () => void;
  /** Título del modal, ej. "Exportar Órdenes a Excel". */
  title: string;
  /** Nombre plural de la entidad para los mensajes, ej. "órdenes". */
  entityLabel: string;
  /** Prefijo del archivo; se le añade el rango de fechas y `.xlsx`. */
  fileNamePrefix: string;
  /** Nombre de la hoja de Excel. */
  sheetName?: string;
  /** Columnas disponibles para exportar. */
  columns: ExportColumn<T>[];
  /** Clave de localStorage para persistir las columnas elegidas (única por módulo). */
  storageKey: string;
  /** Título de la sección de fechas, ej. "Rango de fechas (fecha de orden)". */
  dateRangeLabel?: string;
  /** Nota al pie de las fechas, ej. qué filtros de pantalla se respetan. */
  helperText?: string;
  defaultDateFrom?: Date;
  defaultDateTo?: Date;
  /**
   * Trae las filas a exportar para el rango dado. Cada módulo resuelve aquí su
   * propia forma de respuesta, el nombre de sus campos de fecha y cualquier
   * filtro adicional. Las fechas llegan normalizadas a inicio/fin de día.
   */
  fetchRows: (range: DateRange) => Promise<T[]>;
}

const toDateStart = (d: Date): Date => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDateEnd = (d: Date): Date => {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
};

const oneMonthAgo = (): Date => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d;
};

const loadSavedColumns = <T,>(
  storageKey: string,
  columns: ExportColumn<T>[],
): Set<string> => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const keys = JSON.parse(raw) as string[];
      if (Array.isArray(keys) && keys.length > 0) return new Set(keys);
    }
  } catch {
    // ignorar JSON inválido
  }
  return new Set(columns.filter((c) => c.defaultVisible).map((c) => c.key));
};

export function ExportDialog<T>({
  open,
  onClose,
  title,
  entityLabel,
  fileNamePrefix,
  sheetName,
  columns,
  storageKey,
  dateRangeLabel = 'Rango de fechas',
  helperText,
  defaultDateFrom,
  defaultDateTo,
  fetchRows,
}: ExportDialogProps<T>): React.ReactElement {
  const { enqueueSnackbar } = useSnackbar();

  const [dateFrom, setDateFrom] = useState<Date | null>(
    defaultDateFrom ?? oneMonthAgo,
  );
  const [dateTo, setDateTo] = useState<Date | null>(defaultDateTo ?? new Date());
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(() =>
    loadSavedColumns(storageKey, columns),
  );
  const [isExporting, setIsExporting] = useState(false);

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    if (!dateFrom || !dateTo) {
      enqueueSnackbar('Selecciona un rango de fechas válido', {
        variant: 'warning',
      });
      return;
    }
    if (dateFrom > dateTo) {
      enqueueSnackbar('La fecha "Desde" no puede ser mayor que "Hasta"', {
        variant: 'warning',
      });
      return;
    }

    const selected = columns.filter((c) => selectedColumns.has(c.key));
    if (selected.length === 0) {
      enqueueSnackbar('Selecciona al menos una columna para exportar', {
        variant: 'warning',
      });
      return;
    }

    setIsExporting(true);
    try {
      // Persistir columnas elegidas
      localStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(selectedColumns)),
      );

      const rows = await fetchRows({
        from: toDateStart(dateFrom),
        to: toDateEnd(dateTo),
      });

      if (rows.length === 0) {
        enqueueSnackbar(
          `No se encontraron ${entityLabel} con los filtros seleccionados`,
          { variant: 'info' },
        );
        return;
      }

      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const fileName = `${fileNamePrefix}_${fmt(dateFrom)}_${fmt(dateTo)}.xlsx`;

      exportToExcel(rows, selected, fileName, sheetName);
      enqueueSnackbar(`Se exportaron ${rows.length} ${entityLabel}`, {
        variant: 'success',
      });
      onClose();
    } catch {
      enqueueSnackbar('Ocurrió un error al generar el archivo Excel', {
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const visibleCols = columns.filter((c) => c.defaultVisible);
  const extraCols = columns.filter((c) => !c.defaultVisible);

  const renderColumnGroup = (cols: ExportColumn<T>[]) => (
    <FormGroup
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
      }}
    >
      {cols.map((col) => (
        <FormControlLabel
          key={col.key}
          control={
            <Checkbox
              size='small'
              checked={selectedColumns.has(col.key)}
              onChange={() => toggleColumn(col.key)}
            />
          }
          label={col.label}
        />
      ))}
    </FormGroup>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant='subtitle2' gutterBottom>
              {dateRangeLabel}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DatePicker
                label='Desde'
                value={dateFrom}
                onChange={(date) => setDateFrom(date)}
                slotProps={{
                  textField: { size: 'small', fullWidth: true },
                }}
              />
              <DatePicker
                label='Hasta'
                value={dateTo}
                onChange={(date) => setDateTo(date)}
                slotProps={{
                  textField: { size: 'small', fullWidth: true },
                }}
              />
            </Stack>
            {helperText && (
              <Typography variant='caption' color='text.secondary'>
                {helperText}
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant='subtitle2' gutterBottom>
              Columnas visibles
            </Typography>
            {renderColumnGroup(visibleCols)}
          </Box>

          {extraCols.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant='subtitle2' gutterBottom>
                  Columnas adicionales
                </Typography>
                {renderColumnGroup(extraCols)}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isExporting}>
          Cancelar
        </Button>
        <Button
          variant='contained'
          startIcon={
            isExporting ? (
              <CircularProgress size={16} color='inherit' />
            ) : (
              <FileDownloadIcon />
            )
          }
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? 'Generando...' : 'Exportar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
