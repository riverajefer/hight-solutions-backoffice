import React from 'react';
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

interface CustomToolbarProps {
  onAdd?: () => void;
  addButtonText?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showExport?: boolean;
  onExport?: () => void;
  onToggleColumns?: () => void;
  onToggleFilters?: () => void;
}

export const CustomToolbar: React.FC<CustomToolbarProps> = ({
  onAdd,
  addButtonText = 'Agregar',
  searchPlaceholder = 'Buscar en todos los campos...',
  searchValue = '',
  onSearchChange,
  showExport = false,
  onExport,
  onToggleColumns,
  onToggleFilters,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleClearSearch = () => {
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: isDark
          ? alpha(theme.palette.background.paper, 0.5)
          : alpha(theme.palette.primary.light, 0.05),
        backdropFilter: isDark ? 'blur(8px)' : 'none',
      }}
    >
      {/* Sección de búsqueda */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          flex: 1,
          minWidth: '280px',
          maxWidth: '500px',
        }}
      >
        {onSearchChange && (
          <TextField
            variant="outlined"
            size="small"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: isDark
                  ? alpha(theme.palette.background.paper, 0.6)
                  : theme.palette.background.paper,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '& fieldset': {
                  borderColor: isDark
                    ? alpha(theme.palette.primary.main, 0.3)
                    : alpha(theme.palette.secondary.main, 0.2),
                  transition: 'all 0.3s ease',
                },
                '&:hover fieldset': {
                  borderColor: alpha(theme.palette.primary.main, 0.5),
                },
                '&.Mui-focused': {
                  backgroundColor: isDark
                    ? alpha(theme.palette.background.paper, 0.8)
                    : theme.palette.background.paper,
                  '& fieldset': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 2,
                    boxShadow: isDark
                      ? `0 0 12px ${alpha(theme.palette.primary.main, 0.4)}`
                      : `0 0 8px ${alpha(theme.palette.primary.main, 0.2)}`,
                  },
                },
              },
              '& .MuiInputBase-input': {
                py: 1,
                '&::placeholder': {
                  color: theme.palette.text.secondary,
                  opacity: 0.7,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    fontSize="small"
                    sx={{
                      color: searchValue
                        ? theme.palette.primary.main
                        : theme.palette.text.secondary,
                      transition: 'color 0.3s ease',
                    }}
                  />
                </InputAdornment>
              ),
              endAdornment: searchValue && (
                <InputAdornment position="end">
                  <Tooltip title="Limpiar búsqueda">
                    <IconButton
                      size="small"
                      onClick={handleClearSearch}
                      sx={{
                        color: theme.palette.text.secondary,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          color: theme.palette.primary.main,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        },
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        )}
      </Box>

      {/* Sección de acciones */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          alignItems: 'center',
        }}
      >
        {/* Botones opcionales del toolbar */}
        {(onToggleColumns || onToggleFilters || (showExport && onExport)) && (
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
            }}
          >
            {onToggleColumns && (
              <Tooltip title="Columnas">
                <IconButton
                  size="small"
                  onClick={onToggleColumns}
                  sx={{
                    color: theme.palette.text.secondary,
                    borderRadius: 1.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  <ViewColumnIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onToggleFilters && (
              <Tooltip title="Filtros">
                <IconButton
                  size="small"
                  onClick={onToggleFilters}
                  sx={{
                    color: theme.palette.text.secondary,
                    borderRadius: 1.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  <FilterListIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {showExport && onExport && (
              <Tooltip title="Exportar">
                <IconButton
                  size="small"
                  onClick={onExport}
                  sx={{
                    color: theme.palette.text.secondary,
                    borderRadius: 1.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  <FileDownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {onAdd && (
          <>
            {(onToggleColumns || onToggleFilters || (showExport && onExport)) && (
              <Divider
                orientation="vertical"
                flexItem
                sx={{
                  mx: 1,
                  borderColor: isDark
                    ? alpha(theme.palette.primary.main, 0.2)
                    : alpha(theme.palette.secondary.main, 0.15),
                }}
              />
            )}
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={onAdd}
              sx={{
                px: 2.5,
                py: 0.875,
                fontWeight: 600,
                borderRadius: 2,
                boxShadow: isDark
                  ? `0 0 10px ${alpha(theme.palette.primary.main, 0.3)}`
                  : 'none',
                '&:hover': {
                  boxShadow: isDark
                    ? `0 0 15px ${alpha(theme.palette.primary.main, 0.5)}`
                    : `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              }}
            >
              {addButtonText}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
};
