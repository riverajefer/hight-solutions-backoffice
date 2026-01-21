import React from 'react';
import {
  Box,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
  GridToolbarColumnsButton,
} from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';

interface CustomToolbarProps {
  onAdd?: () => void;
  addButtonText?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showExport?: boolean;
}

export const CustomToolbar: React.FC<CustomToolbarProps> = ({
  onAdd,
  addButtonText = 'Agregar',
  searchPlaceholder = 'Buscar...',
  searchValue,
  onSearchChange,
  showExport = true,
}) => {
  return (
    <GridToolbarContainer sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1, minWidth: '300px' }}>
        {onSearchChange && (
          <TextField
            variant="outlined"
            size="small"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{ width: '100%', maxWidth: '400px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        {showExport && <GridToolbarExport />}
        
        {onAdd && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{ ml: 1 }}
          >
            {addButtonText}
          </Button>
        )}
      </Box>
    </GridToolbarContainer>
  );
};
