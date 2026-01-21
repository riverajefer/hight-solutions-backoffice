import { createTheme, alpha } from '@mui/material/styles';
import {
  neonColors,
  stateColors,
  lightModeColors,
  borderRadius,
  shadows,
} from './colors';

/**
 * Tema Claro - Estilo Neón Moderno
 * Versión suave de los efectos neón para el modo claro
 */
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: neonColors.primary,
    secondary: neonColors.secondary,
    success: stateColors.success,
    warning: stateColors.warning,
    error: stateColors.error,
    info: stateColors.info,
    background: lightModeColors.background,
    text: lightModeColors.text,
    divider: lightModeColors.divider,
    action: lightModeColors.action,
  },

  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.57,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },

  shape: {
    borderRadius: borderRadius.medium,
  },

  shadows: [
    'none',
    shadows.light.sm,
    shadows.light.sm,
    shadows.light.md,
    shadows.light.md,
    shadows.light.md,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
    shadows.light.lg,
  ],

  components: {
    // =========================================================================
    // CssBaseline - Estilos globales
    // =========================================================================
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: `${alpha(neonColors.primary.main, 0.3)} transparent`,
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(neonColors.primary.main, 0.3),
            borderRadius: 4,
            '&:hover': {
              backgroundColor: alpha(neonColors.primary.main, 0.5),
            },
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
        },
      },
    },

    // =========================================================================
    // Botones
    // =========================================================================
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: borderRadius.medium,
          padding: '8px 20px',
          transition: 'all 0.3s ease',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.4)}`,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          background: neonColors.primary.main,
          '&:hover': {
            background: neonColors.primary.dark,
            boxShadow: `0 0 12px ${alpha(neonColors.primary.main, 0.5)}`,
          },
        },
        containedSecondary: {
          background: neonColors.secondary.main,
          '&:hover': {
            background: neonColors.secondary.dark,
            boxShadow: `0 0 12px ${alpha(neonColors.secondary.main, 0.4)}`,
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': {
            borderWidth: 1.5,
            backgroundColor: alpha(neonColors.primary.main, 0.08),
          },
        },
        outlinedPrimary: {
          borderColor: neonColors.primary.main,
          '&:hover': {
            borderColor: neonColors.primary.dark,
            boxShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.3)}`,
          },
        },
        text: {
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.08),
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.08),
          },
        },
      },
    },

    // =========================================================================
    // Inputs y Forms
    // =========================================================================
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            transition: 'all 0.3s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(neonColors.primary.main, 0.5),
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: neonColors.primary.main,
              borderWidth: 2,
              boxShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.2)}`,
            },
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.medium,
          transition: 'all 0.3s ease',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(neonColors.primary.main, 0.5),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: neonColors.primary.main,
            boxShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.2)}`,
          },
        },
        notchedOutline: {
          borderColor: lightModeColors.border,
          transition: 'all 0.3s ease',
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            color: neonColors.primary.main,
          },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.medium,
        },
      },
    },

    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: borderRadius.medium,
          boxShadow: shadows.light.lg,
          border: `1px solid ${lightModeColors.border}`,
        },
      },
    },

    // =========================================================================
    // Cards y Surfaces
    // =========================================================================
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.large,
          boxShadow: shadows.light.md,
          border: `1px solid ${lightModeColors.border}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: shadows.light.lg,
          },
        },
      },
    },

    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '20px 24px 12px',
        },
        title: {
          fontWeight: 600,
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px',
          '&:last-child': {
            paddingBottom: 24,
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: borderRadius.large,
        },
        elevation1: {
          boxShadow: shadows.light.sm,
        },
        elevation2: {
          boxShadow: shadows.light.md,
        },
        elevation3: {
          boxShadow: shadows.light.lg,
        },
      },
    },

    // =========================================================================
    // Tables y DataGrid
    // =========================================================================
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: alpha(neonColors.primary.light, 0.3),
            fontWeight: 600,
            color: neonColors.secondary.main,
          },
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.04),
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${lightModeColors.divider}`,
        },
      },
    },

    // =========================================================================
    // Navigation
    // =========================================================================
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${lightModeColors.border}`,
          backgroundColor: lightModeColors.background.paper,
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.medium,
          margin: '2px 8px',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.08),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(neonColors.primary.main, 0.12),
            borderLeft: `3px solid ${neonColors.primary.main}`,
            '&:hover': {
              backgroundColor: alpha(neonColors.primary.main, 0.16),
            },
          },
        },
      },
    },

    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 40,
          color: 'inherit',
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: shadows.light.sm,
          borderBottom: `1px solid ${lightModeColors.border}`,
          backgroundColor: lightModeColors.background.paper,
          color: lightModeColors.text.primary,
        },
      },
    },

    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '64px !important',
        },
      },
    },

    // =========================================================================
    // Dialogs y Modals
    // =========================================================================
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: borderRadius.xl,
          boxShadow: shadows.light.lg,
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
          fontWeight: 600,
          padding: '20px 24px 12px',
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px',
        },
      },
    },

    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px',
          gap: 8,
        },
      },
    },

    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(neonColors.secondary.main, 0.3),
          backdropFilter: 'blur(4px)',
        },
      },
    },

    // =========================================================================
    // Alerts y Feedback
    // =========================================================================
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.medium,
        },
        standardSuccess: {
          backgroundColor: alpha(stateColors.success.main, 0.12),
          borderLeft: `4px solid ${stateColors.success.main}`,
        },
        standardError: {
          backgroundColor: alpha(stateColors.error.main, 0.12),
          borderLeft: `4px solid ${stateColors.error.main}`,
        },
        standardWarning: {
          backgroundColor: alpha(stateColors.warning.main, 0.12),
          borderLeft: `4px solid ${stateColors.warning.main}`,
        },
        standardInfo: {
          backgroundColor: alpha(stateColors.info.main, 0.12),
          borderLeft: `4px solid ${stateColors.info.main}`,
        },
      },
    },

    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiPaper-root': {
            borderRadius: borderRadius.medium,
          },
        },
      },
    },

    // =========================================================================
    // Chips y Badges
    // =========================================================================
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: borderRadius.medium,
        },
        filled: {
          '&.MuiChip-colorPrimary': {
            backgroundColor: alpha(neonColors.primary.main, 0.12),
            color: neonColors.primary.dark,
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: alpha(neonColors.secondary.main, 0.12),
            color: neonColors.secondary.main,
          },
        },
        outlined: {
          borderWidth: 1.5,
        },
      },
    },

    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
        },
      },
    },

    // =========================================================================
    // Tabs
    // =========================================================================
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
          backgroundColor: neonColors.primary.main,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 48,
          '&.Mui-selected': {
            color: neonColors.primary.main,
          },
        },
      },
    },

    // =========================================================================
    // Tooltips
    // =========================================================================
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: neonColors.secondary.main,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '8px 12px',
          borderRadius: borderRadius.small,
        },
        arrow: {
          color: neonColors.secondary.main,
        },
      },
    },

    // =========================================================================
    // Progress indicators
    // =========================================================================
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.small,
          backgroundColor: alpha(neonColors.primary.main, 0.12),
        },
        bar: {
          borderRadius: borderRadius.small,
        },
      },
    },

    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: neonColors.primary.main,
        },
      },
    },

    // =========================================================================
    // Switches y Checkboxes
    // =========================================================================
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: neonColors.primary.main,
            '& + .MuiSwitch-track': {
              backgroundColor: neonColors.primary.main,
            },
          },
        },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: neonColors.primary.main,
          },
        },
      },
    },

    MuiRadio: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: neonColors.primary.main,
          },
        },
      },
    },

    // =========================================================================
    // Skeleton (loading)
    // =========================================================================
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(neonColors.secondary.main, 0.08),
        },
      },
    },

    // =========================================================================
    // Divider
    // =========================================================================
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: lightModeColors.divider,
        },
      },
    },

    // =========================================================================
    // Avatar
    // =========================================================================
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(neonColors.primary.main, 0.12),
          color: neonColors.primary.main,
          fontWeight: 600,
        },
      },
    },

    // =========================================================================
    // Menu
    // =========================================================================
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: borderRadius.medium,
          boxShadow: shadows.light.lg,
          border: `1px solid ${lightModeColors.border}`,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.small,
          margin: '2px 8px',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.08),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(neonColors.primary.main, 0.12),
            '&:hover': {
              backgroundColor: alpha(neonColors.primary.main, 0.16),
            },
          },
        },
      },
    },

    // =========================================================================
    // Breadcrumbs
    // =========================================================================
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          '& .MuiLink-root': {
            color: neonColors.secondary.main,
            textDecoration: 'none',
            transition: 'color 0.2s ease',
            '&:hover': {
              color: neonColors.primary.main,
            },
          },
        },
      },
    },

    // =========================================================================
    // Link
    // =========================================================================
    MuiLink: {
      styleOverrides: {
        root: {
          color: neonColors.primary.main,
          textDecorationColor: alpha(neonColors.primary.main, 0.4),
          '&:hover': {
            textDecorationColor: neonColors.primary.main,
          },
        },
      },
    },
  },
});

export default lightTheme;
