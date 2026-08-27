import React, { useState, useEffect } from 'react';
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
  Radio,
  RadioGroup,
  Divider,
  CircularProgress,
} from '@mui/material';
import { FileDownload as FileDownloadIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { useSnackbar } from 'notistack';
import {
  exportToExcel,
  type ExportColumn,
  type DetailSheet,
} from '../../utils/excelExport';
import { toDateFilter } from '../../utils/dateFilters';

/** Rango de fechas ya normalizado a inicio y fin de día. */
export interface DateRange {
  from: Date;
  to: Date;
  /**
   * El mismo rango como fecha simple `YYYY-MM-DD`. Es lo que hay que mandar al
   * backend en los filtros de fecha: así el export cuenta exactamente el mismo
   * día que la pantalla. Ver `utils/dateFilters.ts`.
   */
  fromDate: string;
  toDate: string;
  /**
   * Campo de fecha elegido por el usuario cuando el módulo ofrece varios
   * (ver `dateFieldOptions`). Vale `'default'` si el módulo no ofrece opciones.
   */
  dateField: string;
}

/** Opción del selector de "sobre qué fecha se aplica el rango". */
export interface DateFieldOption {
  /** Valor que llega a `fetchRows` y a los `explode` de las hojas de detalle. */
  value: string;
  label: string;
  /**
   * Etiqueta que se agrega al nombre del archivo cuando se elige esta opción
   * (ej. `por-fecha-de-pago`). El campo de fecha decide qué filas existen, no
   * cómo se ven: dos exports del mismo rango pueden traer conjuntos distintos.
   * Sin esto en el nombre, los dos archivos son indistinguibles después de
   * descargarlos. La opción por defecto se deja sin etiqueta.
   */
  fileNameTag?: string;
}

/**
 * Hoja de detalle opcional (relación uno-a-muchos). Si se define, el modal
 * muestra un checkbox para incluir una segunda hoja con una fila por hijo
 * (ej. una fila por ítem de gasto). Las columnas del detalle son fijas.
 */
export interface ExportDetailSheetConfig<T, C> extends DetailSheet<T, C> {
  /** Etiqueta del checkbox, ej. "Incluir detalle de ítems". */
  toggleLabel: string;
  /** Clave de localStorage para recordar si se incluye el detalle. */
  storageKey: string;
  /** Si el checkbox arranca marcado la primera vez (por defecto: false). */
  defaultChecked?: boolean;
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
  /**
   * Si se define, el modal muestra un selector para elegir a qué fecha se
   * aplica el rango (ej. fecha de orden vs. fecha de pago). El valor elegido
   * llega a `fetchRows` y a los `explode` de las hojas de detalle. Si se omite,
   * el modal se comporta igual que siempre y el valor es `'default'`.
   */
  dateFieldOptions?: DateFieldOption[];
  /** Opción marcada la primera vez; por defecto, la primera de la lista. */
  defaultDateField?: string;
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
  /**
   * Hojas de detalle opcionales (relaciones uno-a-muchos). Cada una se muestra
   * con su propio checkbox y, si se marca, se agrega como una hoja aparte.
   */
  detailSheets?: ExportDetailSheetConfig<T, any>[];
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

const loadDetailIncluded = (
  storageKey: string,
  defaultChecked: boolean,
): boolean => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw !== null) return raw === 'true';
  } catch {
    // ignorar acceso inválido
  }
  return defaultChecked;
};

/**
 * El campo de fecha arranca SIEMPRE en el que declare el módulo, sin recordar
 * el de la última vez.
 *
 * Antes se guardaba en localStorage junto con las columnas, pero no es la misma
 * clase de preferencia: las columnas cambian cómo se ve el archivo, el campo de
 * fecha cambia qué filas trae. Un usuario que exportó una vez «por fecha de
 * pago» para conciliar caja seguía exportando en ese modo semanas después, sin
 * nada en pantalla que lo indicara, y las órdenes sin ningún abono
 * desaparecían del archivo en silencio.
 */
const resolveInitialDateField = (
  options: DateFieldOption[] | undefined,
  defaultDateField: string | undefined,
): string => {
  if (!options || options.length === 0) return 'default';
  return defaultDateField ?? options[0].value;
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
  dateFieldOptions,
  defaultDateField,
  helperText,
  defaultDateFrom,
  defaultDateTo,
  fetchRows,
  detailSheets,
}: ExportDialogProps<T>): React.ReactElement {
  const { enqueueSnackbar } = useSnackbar();

  const [dateFrom, setDateFrom] = useState<Date | null>(
    defaultDateFrom ?? oneMonthAgo,
  );
  const [dateTo, setDateTo] = useState<Date | null>(defaultDateTo ?? new Date());

  // El diálogo se monta junto con la pantalla, así que el estado inicial se fija
  // cuando todavía no hay filtros aplicados. Al abrirlo hay que re-sincronizar
  // con el rango de fechas que el usuario tenga puesto en ese momento; si no, el
  // Excel sale con "hace un mes → hoy" y no cuadra con los totales en pantalla.
  useEffect(() => {
    if (!open) return;
    setDateFrom(defaultDateFrom ?? oneMonthAgo());
    setDateTo(defaultDateTo ?? new Date());
    // Se comparan por timestamp para no reaccionar a instancias Date nuevas
    // con el mismo valor (los padres las recrean en cada render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDateFrom?.getTime(), defaultDateTo?.getTime()]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(() =>
    loadSavedColumns(storageKey, columns),
  );
  const [includedDetails, setIncludedDetails] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    (detailSheets ?? []).forEach((d) => {
      initial[d.storageKey] = loadDetailIncluded(
        d.storageKey,
        d.defaultChecked ?? false,
      );
    });
    return initial;
  });
  const [dateField, setDateField] = useState<string>(() =>
    resolveInitialDateField(dateFieldOptions, defaultDateField),
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

  const toggleDetail = (storageKey: string) => {
    setIncludedDetails((prev) => ({
      ...prev,
      [storageKey]: !prev[storageKey],
    }));
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
      // Persistir preferencia de incluir cada hoja de detalle
      (detailSheets ?? []).forEach((d) => {
        localStorage.setItem(
          d.storageKey,
          String(includedDetails[d.storageKey] ?? false),
        );
      });
      const from = toDateStart(dateFrom);
      const to = toDateEnd(dateTo);

      const rows = await fetchRows({
        from,
        to,
        fromDate: toDateFilter(dateFrom),
        toDate: toDateFilter(dateTo),
        dateField,
      });

      if (rows.length === 0) {
        enqueueSnackbar(
          `No se encontraron ${entityLabel} con los filtros seleccionados`,
          { variant: 'info' },
        );
        return;
      }

      // El modo no-por-defecto queda escrito en el nombre: es lo único que
      // sobrevive a la descarga y permite saber, semanas después, con qué
      // criterio se armó el archivo.
      const dateFieldTag = dateFieldOptions?.find((o) => o.value === dateField)
        ?.fileNameTag;
      const fileName = `${fileNamePrefix}_${toDateFilter(dateFrom)}_${toDateFilter(dateTo)}${
        dateFieldTag ? `_${dateFieldTag}` : ''
      }.xlsx`;

      const activeDetails = (detailSheets ?? []).filter(
        (d) => includedDetails[d.storageKey],
      );
      exportToExcel(rows, selected, fileName, sheetName, activeDetails, {
        from,
        to,
        dateField,
      });
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
            {dateFieldOptions && dateFieldOptions.length > 0 && (
              <RadioGroup
                value={dateField}
                onChange={(e) => setDateField(e.target.value)}
                sx={{ mb: 1 }}
              >
                {dateFieldOptions.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio size='small' />}
                    label={option.label}
                  />
                ))}
              </RadioGroup>
            )}
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

          {detailSheets && detailSheets.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant='subtitle2' gutterBottom>
                  Hojas adicionales
                </Typography>
                <Stack spacing={1}>
                  {detailSheets.map((d) => (
                    <Box key={d.storageKey}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size='small'
                            checked={!!includedDetails[d.storageKey]}
                            onChange={() => toggleDetail(d.storageKey)}
                          />
                        }
                        label={d.toggleLabel}
                      />
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        display='block'
                        sx={{ ml: 4 }}
                      >
                        Agrega la hoja «{d.sheetName}» con:{' '}
                        {d.columns.map((c) => c.label).join(', ')}.
                      </Typography>
                    </Box>
                  ))}
                </Stack>
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
