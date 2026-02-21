import { useState, useMemo, useEffect, useRef } from 'react';
import {
  DataGrid,
  GridColDef,
  GridRowIdGetter,
  GridRowParams,
  GridValidRowModel,
  GridRowClassNameParams,
} from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { Paper, Box, Typography, Skeleton } from '@mui/material';
import { CustomToolbar } from './CustomToolbar';
import { dataGridStyles, paperStyles } from './styles';

interface DataTableProps<T extends GridValidRowModel> {
  rows: T[];
  columns: GridColDef[];
  loading?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: T) => void;
  toolbar?: boolean;
  checkboxSelection?: boolean;
  getRowId?: GridRowIdGetter<T>;
  onAdd?: () => void;
  addButtonText?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  serverSideSearch?: boolean;
  showExport?: boolean;
  emptyMessage?: string;
  getRowClassName?: (params: GridRowClassNameParams<T>) => string;
}

export function DataTable<T extends GridValidRowModel>({
  rows,
  columns,
  loading = false,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onRowClick,
  toolbar = true,
  checkboxSelection = false,
  getRowId,
  onAdd,
  addButtonText,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  serverSideSearch = false,
  showExport = false,
  emptyMessage = 'No se encontraron registros',
  getRowClassName,
}: DataTableProps<T>) {
  const [paginationModel, setPaginationModel] = useState({
    pageSize: initialPageSize,
    page: 0,
  });
  const [internalSearchText, setInternalSearchText] = useState(searchValue || '');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');

  const isControlledSearch = searchValue !== undefined && onSearchChange !== undefined;

  const prevSearchValueRef = useRef(searchValue);

  // Sync internal state with external prop if it changes externally
  useEffect(() => {
    if (searchValue !== undefined && searchValue !== prevSearchValueRef.current) {
      setInternalSearchText(searchValue);
      prevSearchValueRef.current = searchValue;
    }
  }, [searchValue]);

  const handleSearchChange = (value: string) => {
    setInternalSearchText(value);
  };

  // Debounce search text
  useEffect(() => {
    const handler = setTimeout(() => {
      if (isControlledSearch && onSearchChange) {
        // Only call onSearchChange if the value actually changed to avoid infinite loops
        if (searchValue !== internalSearchText) {
          onSearchChange(internalSearchText);
        }
      } else {
        setDebouncedSearchText(internalSearchText);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [internalSearchText, isControlledSearch, onSearchChange, searchValue]);

  // Reset to first page when search changes
  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [debouncedSearchText, searchValue]);

  const filteredRows = useMemo(() => {
    if (serverSideSearch || !debouncedSearchText) return rows;

    const lowerSearchText = debouncedSearchText.toLowerCase();

    const searchInObject = (obj: any): boolean => {
      if (obj === null || obj === undefined) return false;
      if (typeof obj === 'object') {
        if (obj instanceof Date) {
          return obj.toISOString().toLowerCase().includes(lowerSearchText);
        }
        return Object.values(obj).some(searchInObject);
      }
      return String(obj).toLowerCase().includes(lowerSearchText);
    };

    return rows.filter(searchInObject);
  }, [rows, debouncedSearchText, serverSideSearch]);

  // Agregar columna de numeración automática
  const columnsWithRowNumber = useMemo<GridColDef[]>(() => {
    const rowNumberColumn: GridColDef = {
      field: '__row_number__',
      headerName: '#',
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const rowIndex = filteredRows.findIndex(
          (row) => (getRowId ? getRowId(row) : row.id) === params.id
        );
        return (
          <Typography
            variant="body2"
            fontWeight={600}
            color="text.secondary"
            sx={{
              opacity: 0.7,
              fontFamily: 'monospace',
            }}
          >
            {paginationModel.page * paginationModel.pageSize + rowIndex + 1}
          </Typography>
        );
      },
    };

    return [rowNumberColumn, ...columns];
  }, [columns, filteredRows, getRowId, paginationModel.page, paginationModel.pageSize]);

  const handleRowClick = (params: GridRowParams<T>) => {
    if (onRowClick) {
      onRowClick(params.row);
    }
  };

  const renderLoadingSkeleton = () => (
    <Box sx={{ width: '100%', p: 2 }}>
      {[...Array(paginationModel.pageSize)].map((_, index) => (
        <Skeleton
          key={index}
          variant="rectangular"
          height={52}
          sx={{ mb: 1, borderRadius: 1 }}
        />
      ))}
    </Box>
  );

  const CustomNoRowsOverlay = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 3
      }}
    >
      <Typography variant="body1" color="textSecondary">
        {debouncedSearchText
          ? `No se encontraron resultados para "${debouncedSearchText}"`
          : emptyMessage
        }
      </Typography>
    </Box>
  );

  return (
    <Paper sx={paperStyles}>
      {/* Toolbar renderizado fuera del DataGrid */}
      {toolbar && (
        <CustomToolbar
          onAdd={onAdd}
          addButtonText={addButtonText}
          searchPlaceholder={searchPlaceholder}
          searchValue={internalSearchText}
          onSearchChange={handleSearchChange}
          showExport={showExport}
        />
      )}

      <DataGrid
        rows={filteredRows}
        columns={columnsWithRowNumber}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={pageSizeOptions}
        checkboxSelection={checkboxSelection}
        getRowId={getRowId}
        onRowClick={onRowClick ? handleRowClick : undefined}
        getRowClassName={getRowClassName}
        disableRowSelectionOnClick
        autoHeight
        localeText={esES.components.MuiDataGrid.defaultProps.localeText}
        sx={dataGridStyles}
        slots={{
          noRowsOverlay: CustomNoRowsOverlay,
          loadingOverlay: renderLoadingSkeleton,
        }}
      />
    </Paper>
  );
}
