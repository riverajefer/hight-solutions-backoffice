import { SxProps, Theme } from '@mui/material';

export const dataGridStyles: SxProps<Theme> = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: (theme) => 
      theme.palette.mode === 'light' ? '#f8f9fa' : '#1e1e1e',
    color: 'text.primary',
    fontWeight: 700,
    borderBottom: '1px solid',
    borderColor: 'divider',
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 600,
  },
  '& .MuiDataGrid-cell': {
    borderBottom: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    padding: (theme) => theme.spacing(1, 2),
  },
  '& .MuiDataGrid-row': {
    '&:hover': {
      backgroundColor: (theme) => 
        theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
      cursor: 'pointer',
    },
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: '1px solid',
    borderColor: 'divider',
  },
  '& .all-columns-header': {
    backgroundColor: (theme) => theme.palette.background.default,
  },
};

export const paperStyles: SxProps<Theme> = {
  width: '100%',
  overflow: 'hidden',
  borderRadius: 2,
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  backgroundColor: 'background.paper',
};
