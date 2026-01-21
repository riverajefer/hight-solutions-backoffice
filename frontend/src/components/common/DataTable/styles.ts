import { SxProps, Theme, alpha } from '@mui/material';

/**
 * Estilos del DataGrid - Estilo Neón Moderno
 * Adaptativo para modo claro y oscuro con efectos neón sutiles
 */
export const dataGridStyles: SxProps<Theme> = {
  border: 'none',
  borderRadius: 2,

  // Headers con estilo neón
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: (theme) =>
      theme.palette.mode === 'light'
        ? alpha(theme.palette.primary.light, 0.15)
        : alpha(theme.palette.secondary.main, 0.2),
    color: (theme) =>
      theme.palette.mode === 'light'
        ? theme.palette.secondary.main
        : theme.palette.primary.light,
    fontWeight: 700,
    borderBottom: '1px solid',
    borderColor: (theme) =>
      theme.palette.mode === 'light'
        ? alpha(theme.palette.secondary.main, 0.15)
        : alpha(theme.palette.primary.main, 0.3),
    minHeight: '52px !important',
  },

  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 600,
    letterSpacing: '0.02em',
  },

  '& .MuiDataGrid-columnSeparator': {
    color: (theme) =>
      theme.palette.mode === 'light'
        ? alpha(theme.palette.secondary.main, 0.2)
        : alpha(theme.palette.primary.main, 0.2),
  },

  // Celdas con transiciones suaves
  '& .MuiDataGrid-cell': {
    borderBottom: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    padding: (theme) => theme.spacing(1, 2),
    transition: 'all 0.2s ease',
    '&:focus': {
      outline: 'none',
    },
    '&:focus-within': {
      outline: 'none',
    },
  },

  // Filas con hover neón
  '& .MuiDataGrid-row': {
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: (theme) =>
        theme.palette.mode === 'light'
          ? alpha(theme.palette.primary.main, 0.04)
          : alpha(theme.palette.primary.main, 0.08),
      cursor: 'pointer',
    },
    '&.Mui-selected': {
      backgroundColor: (theme) =>
        theme.palette.mode === 'light'
          ? alpha(theme.palette.primary.main, 0.08)
          : alpha(theme.palette.primary.main, 0.15),
      '&:hover': {
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? alpha(theme.palette.primary.main, 0.12)
            : alpha(theme.palette.primary.main, 0.2),
      },
    },
  },

  // Filas alternadas sutiles
  '& .MuiDataGrid-row:nth-of-type(even)': {
    backgroundColor: (theme) =>
      theme.palette.mode === 'light'
        ? alpha(theme.palette.secondary.main, 0.02)
        : alpha(theme.palette.background.paper, 0.3),
  },

  // Footer
  '& .MuiDataGrid-footerContainer': {
    borderTop: '1px solid',
    borderColor: 'divider',
    backgroundColor: (theme) =>
      theme.palette.mode === 'light'
        ? alpha(theme.palette.primary.light, 0.05)
        : alpha(theme.palette.secondary.main, 0.1),
  },

  // Pagination
  '& .MuiTablePagination-root': {
    color: 'text.secondary',
  },

  '& .MuiTablePagination-selectIcon': {
    color: 'text.secondary',
  },

  // Checkboxes con estilo neón
  '& .MuiCheckbox-root': {
    color: (theme) =>
      theme.palette.mode === 'light'
        ? alpha(theme.palette.secondary.main, 0.5)
        : alpha(theme.palette.primary.main, 0.5),
    '&.Mui-checked': {
      color: 'primary.main',
    },
  },

  // No rows overlay
  '& .MuiDataGrid-overlay': {
    backgroundColor: (theme) =>
      theme.palette.mode === 'light'
        ? alpha(theme.palette.background.paper, 0.9)
        : alpha(theme.palette.background.paper, 0.8),
    backdropFilter: 'blur(4px)',
  },

  // Virtual scroller
  '& .MuiDataGrid-virtualScroller': {
    backgroundColor: 'background.paper',
  },

  '& .all-columns-header': {
    backgroundColor: (theme) => theme.palette.background.default,
  },

  // Menu de columnas
  '& .MuiDataGrid-menuIcon': {
    color: (theme) =>
      theme.palette.mode === 'light'
        ? theme.palette.secondary.main
        : theme.palette.primary.light,
  },

  // Sorting icons
  '& .MuiDataGrid-sortIcon': {
    color: (theme) =>
      theme.palette.mode === 'light'
        ? theme.palette.primary.main
        : theme.palette.primary.light,
  },
};

/**
 * Estilos del contenedor Paper - Glassmorphism en modo oscuro
 */
export const paperStyles: SxProps<Theme> = {
  width: '100%',
  overflow: 'hidden',
  borderRadius: 3,
  backgroundColor: (theme) =>
    theme.palette.mode === 'light'
      ? theme.palette.background.paper
      : alpha(theme.palette.background.paper, 0.7),
  backdropFilter: (theme) =>
    theme.palette.mode === 'dark' ? 'blur(10px)' : 'none',
  border: '1px solid',
  borderColor: (theme) =>
    theme.palette.mode === 'light'
      ? alpha(theme.palette.secondary.main, 0.1)
      : alpha(theme.palette.primary.main, 0.2),
  boxShadow: (theme) =>
    theme.palette.mode === 'light'
      ? '0 4px 20px rgba(0, 0, 0, 0.08)'
      : `0 4px 20px rgba(0, 0, 0, 0.3), 0 0 15px ${alpha(theme.palette.primary.main, 0.1)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: (theme) =>
      theme.palette.mode === 'light'
        ? '0 6px 24px rgba(0, 0, 0, 0.1)'
        : `0 6px 24px rgba(0, 0, 0, 0.4), 0 0 20px ${alpha(theme.palette.primary.main, 0.15)}`,
  },
};

/**
 * Estilos para el toolbar del DataGrid
 */
export const toolbarStyles: SxProps<Theme> = {
  padding: 2,
  display: 'flex',
  gap: 2,
  alignItems: 'center',
  borderBottom: '1px solid',
  borderColor: 'divider',
  backgroundColor: (theme) =>
    theme.palette.mode === 'light'
      ? alpha(theme.palette.background.paper, 0.8)
      : alpha(theme.palette.background.paper, 0.5),
  backdropFilter: 'blur(8px)',
};
