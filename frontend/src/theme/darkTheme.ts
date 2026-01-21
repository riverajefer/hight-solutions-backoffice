import { createTheme, alpha } from '@mui/material/styles';
import {
  neonColors,
  stateColors,
  darkModeColors,
  neonEffects,
  borderRadius,
  shadows,
} from './colors';

/**
 * Tema Oscuro - Estilo Neón Moderno
 * Efectos neón intensos con glassmorphism para el modo oscuro
 */
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      ...neonColors.primary,
      main: neonColors.primary.main,
    },
    secondary: {
      ...neonColors.secondary,
      light: '#7B7FB8',
    },
    success: stateColors.success,
    warning: stateColors.warning,
    error: stateColors.error,
    info: stateColors.info,
    background: darkModeColors.background,
    text: darkModeColors.text,
    divider: darkModeColors.divider,
    action: darkModeColors.action,
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
    shadows.dark.sm,
    shadows.dark.sm,
    shadows.dark.md,
    shadows.dark.md,
    shadows.dark.md,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
    shadows.dark.lg,
  ],

  components: {
    // =========================================================================
    // CssBaseline - Estilos globales
    // =========================================================================
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: `${alpha(neonColors.primary.main, 0.4)} transparent`,
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(neonColors.primary.main, 0.4),
            borderRadius: 4,
            '&:hover': {
              backgroundColor: alpha(neonColors.primary.main, 0.6),
            },
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
        },
      },
    },

    // =========================================================================
    // Botones - Con efectos neón
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
          boxShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.3)}`,
          '&:hover': {
            boxShadow: neonEffects.glow.cyan,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          background: neonColors.primary.main,
          '&:hover': {
            background: neonColors.primary.main,
            boxShadow: neonEffects.glow.cyanIntense,
          },
        },
        containedSecondary: {
          background: neonColors.secondary.main,
          '&:hover': {
            background: neonColors.secondary.light,
            boxShadow: `0 0 15px ${alpha(neonColors.secondary.main, 0.5)}`,
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': {
            borderWidth: 1.5,
            backgroundColor: alpha(neonColors.primary.main, 0.1),
            boxShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.3)}`,
          },
        },
        outlinedPrimary: {
          borderColor: neonColors.primary.main,
          '&:hover': {
            borderColor: neonColors.primary.light,
            boxShadow: neonEffects.glow.cyan,
          },
        },
        text: {
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.1),
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
            backgroundColor: alpha(neonColors.primary.main, 0.15),
            boxShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.4)}`,
          },
        },
      },
    },

    // =========================================================================
    // Inputs y Forms - Con glow en focus
    // =========================================================================
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            transition: 'all 0.3s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(neonColors.primary.main, 0.6),
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: neonColors.primary.main,
              borderWidth: 2,
              boxShadow: neonEffects.glow.cyan,
            },
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.medium,
          backgroundColor: alpha(darkModeColors.background.paper, 0.5),
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(neonColors.primary.main, 0.6),
          },
          '&.Mui-focused': {
            backgroundColor: alpha(darkModeColors.background.paper, 0.7),
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: neonColors.primary.main,
              boxShadow: neonEffects.glow.cyan,
            },
          },
        },
        notchedOutline: {
          borderColor: darkModeColors.border,
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
          backgroundColor: darkModeColors.background.paper,
          backdropFilter: 'blur(10px)',
          boxShadow: shadows.dark.lg,
          border: `1px solid ${darkModeColors.border}`,
        },
      },
    },

    // =========================================================================
    // Cards y Surfaces - Glassmorphism
    // =========================================================================
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.large,
          backgroundColor: alpha(darkModeColors.background.paper, 0.7),
          backdropFilter: 'blur(10px)',
          border: `1px solid ${darkModeColors.border}`,
          boxShadow: shadows.dark.md,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: `${shadows.dark.lg}, 0 0 20px ${alpha(neonColors.primary.main, 0.15)}`,
            borderColor: alpha(neonColors.primary.main, 0.4),
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
          backgroundColor: alpha(darkModeColors.background.paper, 0.8),
          backdropFilter: 'blur(10px)',
        },
        rounded: {
          borderRadius: borderRadius.large,
        },
        elevation1: {
          boxShadow: shadows.dark.sm,
          border: `1px solid ${alpha(darkModeColors.border, 0.5)}`,
        },
        elevation2: {
          boxShadow: shadows.dark.md,
          border: `1px solid ${darkModeColors.border}`,
        },
        elevation3: {
          boxShadow: shadows.dark.lg,
          border: `1px solid ${darkModeColors.border}`,
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
            backgroundColor: alpha(neonColors.secondary.main, 0.3),
            fontWeight: 600,
            color: neonColors.primary.light,
            borderBottom: `1px solid ${darkModeColors.border}`,
          },
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.08),
            boxShadow: `inset 0 0 0 1px ${alpha(neonColors.primary.main, 0.2)}`,
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${alpha(darkModeColors.divider, 0.5)}`,
        },
      },
    },

    // =========================================================================
    // Navigation - Con indicadores neón
    // =========================================================================
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${darkModeColors.border}`,
          backgroundColor: darkModeColors.background.paper,
          backgroundImage: 'none',
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
            backgroundColor: alpha(neonColors.primary.main, 0.12),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(neonColors.primary.main, 0.15),
            borderLeft: `3px solid ${neonColors.primary.main}`,
            boxShadow: `inset 0 0 15px ${alpha(neonColors.primary.main, 0.1)}`,
            '&:hover': {
              backgroundColor: alpha(neonColors.primary.main, 0.2),
            },
            '& .MuiListItemIcon-root': {
              color: neonColors.primary.main,
            },
            '& .MuiListItemText-primary': {
              color: neonColors.primary.main,
              fontWeight: 600,
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
          transition: 'all 0.2s ease',
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: `0 0 15px ${alpha(neonColors.primary.main, 0.1)}`,
          borderBottom: `1px solid ${darkModeColors.border}`,
          backgroundColor: alpha(darkModeColors.background.paper, 0.9),
          backdropFilter: 'blur(10px)',
          color: darkModeColors.text.primary,
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
    // Dialogs y Modals - Con blur y glassmorphism
    // =========================================================================
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: borderRadius.xl,
          backgroundColor: alpha(darkModeColors.background.paper, 0.9),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${darkModeColors.border}`,
          boxShadow: `${shadows.dark.lg}, 0 0 30px ${alpha(neonColors.primary.main, 0.2)}`,
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
          backgroundColor: alpha(neonColors.base.black, 0.7),
          backdropFilter: 'blur(8px)',
        },
      },
    },

    // =========================================================================
    // Alerts y Feedback - Con bordes neón
    // =========================================================================
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.medium,
          backdropFilter: 'blur(10px)',
        },
        standardSuccess: {
          backgroundColor: alpha(stateColors.success.main, 0.15),
          borderLeft: `4px solid ${stateColors.success.main}`,
          boxShadow: `0 0 10px ${alpha(stateColors.success.main, 0.2)}`,
        },
        standardError: {
          backgroundColor: alpha(stateColors.error.main, 0.15),
          borderLeft: `4px solid ${stateColors.error.main}`,
          boxShadow: `0 0 10px ${alpha(stateColors.error.main, 0.2)}`,
        },
        standardWarning: {
          backgroundColor: alpha(stateColors.warning.main, 0.15),
          borderLeft: `4px solid ${stateColors.warning.main}`,
          boxShadow: `0 0 10px ${alpha(stateColors.warning.main, 0.2)}`,
        },
        standardInfo: {
          backgroundColor: alpha(stateColors.info.main, 0.15),
          borderLeft: `4px solid ${stateColors.info.main}`,
          boxShadow: `0 0 10px ${alpha(stateColors.info.main, 0.2)}`,
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
    // Chips y Badges - Con glow sutil
    // =========================================================================
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: borderRadius.medium,
        },
        filled: {
          '&.MuiChip-colorPrimary': {
            backgroundColor: alpha(neonColors.primary.main, 0.2),
            color: neonColors.primary.light,
            boxShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.3)}`,
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: alpha(neonColors.secondary.main, 0.2),
            color: neonColors.secondary.light,
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&.MuiChip-colorPrimary': {
            borderColor: alpha(neonColors.primary.main, 0.5),
          },
        },
      },
    },

    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
          boxShadow: `0 0 6px ${alpha(neonColors.primary.main, 0.4)}`,
        },
      },
    },

    // =========================================================================
    // Tabs - Con indicador neón
    // =========================================================================
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
          backgroundColor: neonColors.primary.main,
          boxShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.6)}`,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 48,
          transition: 'all 0.2s ease',
          '&.Mui-selected': {
            color: neonColors.primary.main,
          },
          '&:hover': {
            color: neonColors.primary.light,
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
          backgroundColor: alpha(neonColors.secondary.main, 0.95),
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '8px 12px',
          borderRadius: borderRadius.small,
          boxShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.3)}`,
          border: `1px solid ${alpha(neonColors.primary.main, 0.2)}`,
        },
        arrow: {
          color: alpha(neonColors.secondary.main, 0.95),
        },
      },
    },

    // =========================================================================
    // Progress indicators - Con glow
    // =========================================================================
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.small,
          backgroundColor: alpha(neonColors.primary.main, 0.15),
        },
        bar: {
          borderRadius: borderRadius.small,
          boxShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.5)}`,
        },
      },
    },

    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: neonColors.primary.main,
          filter: `drop-shadow(0 0 6px ${alpha(neonColors.primary.main, 0.5)})`,
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
              boxShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.5)}`,
            },
          },
          '& .MuiSwitch-thumb': {
            boxShadow: `0 0 4px ${alpha(neonColors.primary.main, 0.3)}`,
          },
        },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: neonColors.primary.main,
            filter: `drop-shadow(0 0 4px ${alpha(neonColors.primary.main, 0.5)})`,
          },
        },
      },
    },

    MuiRadio: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: neonColors.primary.main,
            filter: `drop-shadow(0 0 4px ${alpha(neonColors.primary.main, 0.5)})`,
          },
        },
      },
    },

    // =========================================================================
    // Skeleton (loading) - Con shimmer effect
    // =========================================================================
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(neonColors.secondary.main, 0.15),
        },
      },
    },

    // =========================================================================
    // Divider
    // =========================================================================
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: darkModeColors.divider,
        },
      },
    },

    // =========================================================================
    // Avatar
    // =========================================================================
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(neonColors.primary.main, 0.2),
          color: neonColors.primary.main,
          fontWeight: 600,
          boxShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.3)}`,
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
          backgroundColor: alpha(darkModeColors.background.paper, 0.95),
          backdropFilter: 'blur(10px)',
          boxShadow: shadows.dark.lg,
          border: `1px solid ${darkModeColors.border}`,
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
            backgroundColor: alpha(neonColors.primary.main, 0.12),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(neonColors.primary.main, 0.15),
            '&:hover': {
              backgroundColor: alpha(neonColors.primary.main, 0.2),
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
            color: darkModeColors.text.secondary,
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              color: neonColors.primary.main,
              textShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.5)}`,
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
          transition: 'all 0.2s ease',
          '&:hover': {
            textDecorationColor: neonColors.primary.main,
            textShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.4)}`,
          },
        },
      },
    },
  },
});

export default darkTheme;
