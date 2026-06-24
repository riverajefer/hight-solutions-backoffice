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
import { ordersApi } from '../../../api/orders.api';
import type { FilterOrdersDto } from '../../../types/order.types';
import {
  ORDER_EXPORT_COLUMNS,
  type OrderExportColumn,
} from '../utils/orderExportColumns';
import { exportOrdersToExcel } from '../utils/exportOrders';

const STORAGE_KEY = 'orders_export_columns';
// Límite alto para traer todos los registros del rango sin paginar
const EXPORT_LIMIT = 100000;

interface ExportOrdersDialogProps {
  open: boolean;
  onClose: () => void;
  /** Filtros activos de la pantalla (estado, cliente, asesor, área, búsqueda). */
  currentFilters: FilterOrdersDto;
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

const loadSavedColumns = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const keys = JSON.parse(raw) as string[];
      if (Array.isArray(keys) && keys.length > 0) return new Set(keys);
    }
  } catch {
    // ignorar JSON inválido
  }
  return new Set(
    ORDER_EXPORT_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
  );
};

export const ExportOrdersDialog: React.FC<ExportOrdersDialogProps> = ({
  open,
  onClose,
  currentFilters,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  // Rango por defecto: último mes (hoy - 1 mes → hoy), respetando filtros activos
  const defaultFrom = currentFilters.orderDateFrom
    ? new Date(currentFilters.orderDateFrom)
    : (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
      })();
  const defaultTo = currentFilters.orderDateTo
    ? new Date(currentFilters.orderDateTo)
    : new Date();

  const [dateFrom, setDateFrom] = useState<Date | null>(defaultFrom);
  const [dateTo, setDateTo] = useState<Date | null>(defaultTo);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    loadSavedColumns,
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

    const columns: OrderExportColumn[] = ORDER_EXPORT_COLUMNS.filter((c) =>
      selectedColumns.has(c.key),
    );
    if (columns.length === 0) {
      enqueueSnackbar('Selecciona al menos una columna para exportar', {
        variant: 'warning',
      });
      return;
    }

    setIsExporting(true);
    try {
      // Persistir columnas elegidas
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(selectedColumns)),
      );

      // Traer todos los registros del rango + filtros activos (sin paginar).
      // Se descartan page/limit de la pantalla para usar los del export.
      const activeFilters: FilterOrdersDto = { ...currentFilters };
      delete activeFilters.page;
      delete activeFilters.limit;
      const response = await ordersApi.getAll({
        ...activeFilters,
        orderDateFrom: toDateStart(dateFrom).toISOString(),
        orderDateTo: toDateEnd(dateTo).toISOString(),
        page: 1,
        limit: EXPORT_LIMIT,
      });

      const orders = response.data ?? [];
      if (orders.length === 0) {
        enqueueSnackbar(
          'No se encontraron órdenes con los filtros seleccionados',
          { variant: 'info' },
        );
        return;
      }

      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const fileName = `Ordenes_Pedido_${fmt(dateFrom)}_${fmt(dateTo)}.xlsx`;

      exportOrdersToExcel(orders, columns, fileName);
      enqueueSnackbar(`Se exportaron ${orders.length} órdenes`, {
        variant: 'success',
      });
      onClose();
    } catch (error) {
      enqueueSnackbar('Ocurrió un error al generar el archivo Excel', {
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const visibleCols = ORDER_EXPORT_COLUMNS.filter((c) => c.defaultVisible);
  const extraCols = ORDER_EXPORT_COLUMNS.filter((c) => !c.defaultVisible);

  const renderColumnGroup = (cols: OrderExportColumn[]) => (
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
      <DialogTitle>Exportar Órdenes a Excel</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant='subtitle2' gutterBottom>
              Rango de fechas (fecha de orden)
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
            <Typography variant='caption' color='text.secondary'>
              Se respetan los filtros activos de la pantalla (estado, cliente,
              asesor, área y búsqueda).
            </Typography>
          </Box>

          <Box>
            <Typography variant='subtitle2' gutterBottom>
              Columnas visibles
            </Typography>
            {renderColumnGroup(visibleCols)}
          </Box>

          <Divider />

          <Box>
            <Typography variant='subtitle2' gutterBottom>
              Columnas adicionales
            </Typography>
            {renderColumnGroup(extraCols)}
          </Box>
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
};
