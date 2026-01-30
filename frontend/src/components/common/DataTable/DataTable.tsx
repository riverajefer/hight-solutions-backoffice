import { useState, useMemo, useEffect } from 'react';
import {
  DataGrid,
  GridColDef,
  GridRowIdGetter,
  GridRowParams,
  GridValidRowModel,
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
  showExport?: boolean;
  emptyMessage?: string;
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
  showExport = false,
  emptyMessage = 'No se encontraron registros',
}: DataTableProps<T>) {
  const [paginationModel, setPaginationModel] = useState({
    pageSize: initialPageSize,
    page: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');

  // Debounce search text
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchText]);

  // Reset to first page when search changes
  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [debouncedSearchText]);

  const filteredRows = useMemo(() => {
    if (!debouncedSearchText) return rows;

    const lowerSearchText = debouncedSearchText.toLowerCase();
    return rows.filter((row) => {
      return Object.values(row).some((value) => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowerSearchText);
      });
    });
  }, [rows, debouncedSearchText]);

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
          searchValue={searchText}
          onSearchChange={setSearchText}
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
