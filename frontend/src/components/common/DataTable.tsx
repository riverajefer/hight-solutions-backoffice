import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';

interface DataTableColumn<T> {
  id: keyof T;
  label: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  format?: (value: unknown) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowsPerPage?: number;
  page?: number;
  total?: number;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
}

/**
 * Tabla genérica con paginación
 */
export const DataTable = React.forwardRef<HTMLDivElement, DataTableProps<unknown>>(
  (
    {
      columns,
      rows,
      rowsPerPage = 10,
      page = 0,
      total,
      isLoading = false,
      onPageChange,
      onRowsPerPageChange,
      getRowId,
      onRowClick,
      actions,
      emptyMessage = 'No hay datos disponibles',
    },
    ref
  ) => {
    const handleChangePage = (_: unknown, newPage: number) => {
      onPageChange?.(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
      onRowsPerPageChange?.(parseInt(event.target.value, 10));
    };

    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (rows.length === 0) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          p={4}
          sx={{ minHeight: 300 }}
        >
          <Typography color="textSecondary">{emptyMessage}</Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} ref={ref}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  width={column.width}
                  align={column.align || 'left'}
                  sx={{ fontWeight: 600 }}
                >
                  {column.label}
                </TableCell>
              ))}
              {actions && <TableCell align="center" sx={{ fontWeight: 600 }}>Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={getRowId ? getRowId(row as unknown) : index}
                onClick={() => onRowClick?.(row)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: onRowClick ? '#f5f5f5' : 'inherit',
                  },
                }}
              >
                {columns.map((column) => (
                  <TableCell key={String(column.id)} align={column.align || 'left'}>
                    {column.format
                      ? column.format((row as Record<string, unknown>)[column.id as string])
                      : String((row as Record<string, unknown>)[column.id as string] || '-')}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell align="center">
                    {actions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={total || rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>
    );
  }
);

DataTable.displayName = 'DataTable';
