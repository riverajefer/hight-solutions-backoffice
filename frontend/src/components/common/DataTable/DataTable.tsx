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
  showExport = true,
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
        {emptyMessage}
      </Typography>
    </Box>
  );

  return (
    <Paper sx={paperStyles}>
      <DataGrid
        rows={filteredRows}
        columns={columns}
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
          toolbar: toolbar ? () => (
            <CustomToolbar
              onAdd={onAdd}
              addButtonText={addButtonText}
              searchPlaceholder={searchPlaceholder}
              searchValue={searchText}
              onSearchChange={setSearchText}
              showExport={showExport}
            />
          ) : undefined,
          noRowsOverlay: CustomNoRowsOverlay,
          loadingOverlay: renderLoadingSkeleton,
        }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
          },
        }}
      />
    </Paper>
  );
}
