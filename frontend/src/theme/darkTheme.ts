import { createTheme, alpha } from '@mui/material/styles';
import {
  neonColors,
  neonAccents,
  stateColors,
  darkModeColors,
  darkSurfaces,
  neonEffects,
  gradients,
  borderRadius,
  shadows,
} from './colors';

/**
 * Tema Oscuro - Estilo Neón Elegante con Degradados
 * Efectos neón intensos, glassmorphism y degradados vibrantes
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
      light: neonAccents.vividPurple,
    },
    success: stateColors.success,
    warning: stateColors.warning,
    error: stateColors.error,
    info: stateColors.info,
    background: {
      default: darkModeColors.background.default,
      paper: darkModeColors.background.paper,
    },
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
      fontWeight: 600,
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
    // CssBaseline - Estilos globales y animaciones
    // =========================================================================
    MuiCssBaseline: {
      styleOverrides: {
        '@global': {
          '@keyframes neonPulse': {
            '0%, 100%': {
              boxShadow: `0 0 5px ${neonColors.primary.main}, 0 0 10px ${neonColors.primary.main}, 0 0 20px rgba(46, 176, 196, 0.6)`,
            },
            '50%': {
              boxShadow: `0 0 10px ${neonColors.primary.main}, 0 0 20px ${neonColors.primary.main}, 0 0 40px rgba(46, 176, 196, 0.8), 0 0 60px rgba(139, 92, 246, 0.4)`,
            },
          },
          '@keyframes gradientShift': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
          },
          '@keyframes shimmer': {
            '0%': { backgroundPosition: '-200% 0' },
            '100%': { backgroundPosition: '200% 0' },
          },
        },
        html: {
          scrollBehavior: 'smooth',
        },
        body: {
          background: gradients.darkMesh,
          backgroundAttachment: 'fixed',
          scrollbarColor: `${alpha(neonColors.primary.main, 0.4)} transparent`,
          '&::-webkit-scrollbar': {
            width: 10,
            height: 10,
          },
          '&::-webkit-scrollbar-thumb': {
            background: `linear-gradient(180deg, ${neonColors.primary.main} 0%, ${neonAccents.vividPurple} 100%)`,
            borderRadius: 5,
            '&:hover': {
              background: `linear-gradient(180deg, ${neonColors.primary.light} 0%, ${neonAccents.vividPurple} 100%)`,
              boxShadow: neonEffects.glow.cyanSubtle,
            },
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: alpha(darkSurfaces.midnightBlue, 0.5),
          },
        },
        '::selection': {
          backgroundColor: alpha(neonColors.primary.main, 0.3),
          color: neonColors.base.white,
        },
      },
    },

    // =========================================================================
    // Botones - Con gradientes y efectos neón
    // =========================================================================
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: borderRadius.large,
          padding: '10px 24px',
          transition: 'all 0.3s ease',
        },
        contained: {
          boxShadow: `0 4px 15px ${alpha(neonColors.primary.main, 0.4)}`,
          '&:hover': {
            transform: 'translateY(-2px) scale(1.02)',
            boxShadow: neonEffects.glow.cyanIntense,
          },
          '&:active': {
            transform: 'translateY(0) scale(1)',
          },
        },
        containedPrimary: {
          background: gradients.ocean,
          '&:hover': {
            background: gradients.ocean,
            boxShadow: `${neonEffects.glow.cyanIntense}, 0 8px 25px ${alpha(neonColors.primary.main, 0.5)}`,
          },
        },
        containedSecondary: {
          background: gradients.neonPrimary,
          '&:hover': {
            background: gradients.neonPrimary,
            boxShadow: `${neonEffects.glow.multi}, 0 8px 25px ${alpha(neonAccents.vividPurple, 0.4)}`,
          },
        },
        containedError: {
          background: gradients.sunset,
          '&:hover': {
            background: gradients.sunset,
            boxShadow: `${neonEffects.glow.magenta}, 0 8px 25px ${alpha(neonAccents.neonMagenta, 0.4)}`,
          },
        },
        outlined: {
          borderWidth: 2,
          borderColor: neonColors.primary.main,
          '&:hover': {
            borderWidth: 2,
            backgroundColor: alpha(neonColors.primary.main, 0.1),
            boxShadow: neonEffects.glow.cyanSubtle,
          },
        },
        outlinedPrimary: {
          '&:hover': {
            borderColor: neonColors.primary.light,
            boxShadow: neonEffects.glow.cyanSubtle,
          },
        },
        outlinedSecondary: {
          borderColor: neonAccents.vividPurple,
          '&:hover': {
            borderColor: neonAccents.vividPurple,
            backgroundColor: alpha(neonAccents.vividPurple, 0.1),
            boxShadow: `0 0 15px ${alpha(neonAccents.vividPurple, 0.4)}`,
          },
        },
        text: {
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.12),
            textShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.5)}`,
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
            boxShadow: `0 0 12px ${alpha(neonColors.primary.main, 0.5)}`,
            transform: 'scale(1.1)',
          },
        },
      },
    },

    MuiFab: {
      styleOverrides: {
        root: {
          background: gradients.ocean,
          boxShadow: `0 4px 20px ${alpha(neonColors.primary.main, 0.4)}`,
          '&:hover': {
            background: gradients.ocean,
            boxShadow: neonEffects.glow.cyanIntense,
            transform: 'scale(1.1)',
          },
        },
      },
    },

    // =========================================================================
    // Inputs y Forms - Con glow neón en focus
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
              boxShadow: neonEffects.glow.cyanSubtle,
            },
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.medium,
          backgroundColor: alpha(darkSurfaces.navyMist, 0.6),
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(neonColors.primary.main, 0.6),
          },
          '&.Mui-focused': {
            backgroundColor: alpha(darkSurfaces.navyMist, 0.8),
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: neonColors.primary.main,
              boxShadow: `0 0 0 3px ${alpha(neonColors.primary.main, 0.2)}, ${neonEffects.glow.cyanSubtle}`,
            },
          },
        },
        notchedOutline: {
          borderColor: alpha(neonAccents.vividPurple, 0.3),
          transition: 'all 0.3s ease',
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            color: neonColors.primary.main,
            textShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.4)}`,
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
          borderRadius: borderRadius.large,
          background: gradients.darkCard,
          backdropFilter: 'blur(16px)',
          boxShadow: `${shadows.dark.lg}, ${shadows.dark.neon}`,
          border: `1px solid ${alpha(neonAccents.vividPurple, 0.3)}`,
        },
        option: {
          borderRadius: borderRadius.small,
          margin: '2px 8px',
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.15),
          },
          '&[aria-selected="true"]': {
            backgroundColor: alpha(neonColors.primary.main, 0.2),
          },
        },
      },
    },

    // =========================================================================
    // Cards y Surfaces - Glassmorphism con gradientes
    // =========================================================================
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.xl,
          background: gradients.darkCard,
          backdropFilter: 'blur(16px)',
          border: `1px solid ${alpha(neonAccents.vividPurple, 0.2)}`,
          boxShadow: shadows.dark.card,
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: alpha(neonColors.primary.main, 0.5),
            boxShadow: `${shadows.dark.card}, ${shadows.dark.neonHover}`,
            transform: 'translateY(-4px)',
          },
        },
      },
    },

    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '24px 24px 12px',
        },
        title: {
          fontWeight: 600,
          color: neonColors.base.white,
        },
        subheader: {
          color: darkModeColors.text.secondary,
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '12px 24px 24px',
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
          background: gradients.darkCard,
          backdropFilter: 'blur(12px)',
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
          boxShadow: `${shadows.dark.lg}, ${shadows.dark.neon}`,
          border: `1px solid ${darkModeColors.border}`,
        },
      },
    },

    // =========================================================================
    // Tables y DataGrid - Con headers gradient y filas vibrantes
    // =========================================================================
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.large,
          border: `1px solid ${alpha(neonAccents.vividPurple, 0.2)}`,
          overflow: 'hidden',
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            background: gradients.tableHeaderDark,
            fontWeight: 600,
            color: neonColors.primary.light,
            borderBottom: `2px solid ${alpha(neonColors.primary.main, 0.3)}`,
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
          },
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&:nth-of-type(odd)': {
            backgroundColor: alpha(darkSurfaces.midnightBlue, 0.8),
          },
          '&:nth-of-type(even)': {
            backgroundColor: alpha(darkSurfaces.navyMist, 0.6),
          },
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.12),
            boxShadow: `inset 0 0 20px ${alpha(neonColors.primary.main, 0.1)}`,
          },
          '&.Mui-selected': {
            background: `linear-gradient(90deg, ${alpha(neonColors.primary.main, 0.2)}, ${alpha(neonAccents.vividPurple, 0.15)})`,
            borderLeft: `3px solid ${neonColors.primary.main}`,
            '&:hover': {
              background: `linear-gradient(90deg, ${alpha(neonColors.primary.main, 0.25)}, ${alpha(neonAccents.vividPurple, 0.2)})`,
            },
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${alpha(neonAccents.vividPurple, 0.1)}`,
          padding: '16px',
        },
      },
    },

    MuiTablePagination: {
      styleOverrides: {
        root: {
          background: gradients.darkCard,
          borderTop: `1px solid ${alpha(neonColors.primary.main, 0.2)}`,
        },
      },
    },

    // =========================================================================
    // Navigation - Sidebar con gradiente neón
    // =========================================================================
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${alpha(neonAccents.vividPurple, 0.2)}`,
          background: gradients.darkSidebar,
          backgroundImage: 'none',
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.large,
          margin: '4px 12px',
          padding: '12px 16px',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.15),
            transform: 'translateX(4px)',
          },
          '&.Mui-selected': {
            background: `linear-gradient(90deg, ${alpha(neonColors.primary.main, 0.2)}, ${alpha(neonAccents.vividPurple, 0.1)})`,
            boxShadow: `inset 0 0 20px ${alpha(neonColors.primary.main, 0.15)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 4,
              height: '60%',
              background: `linear-gradient(180deg, ${neonColors.primary.main}, ${neonAccents.vividPurple})`,
              borderRadius: '0 4px 4px 0',
              boxShadow: `0 0 10px ${neonColors.primary.main}`,
            },
            '&:hover': {
              backgroundColor: alpha(neonColors.primary.main, 0.25),
              transform: 'translateX(4px)',
            },
            '& .MuiListItemIcon-root': {
              color: neonColors.primary.main,
              filter: `drop-shadow(0 0 4px ${alpha(neonColors.primary.main, 0.6)})`,
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
          color: darkModeColors.text.secondary,
          transition: 'all 0.2s ease',
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: `0 0 20px ${alpha(neonColors.primary.main, 0.15)}`,
          borderBottom: `1px solid ${alpha(neonAccents.vividPurple, 0.2)}`,
          background: `linear-gradient(90deg, ${alpha(darkSurfaces.midnightBlue, 0.95)} 0%, ${alpha(darkSurfaces.cosmicPurple, 0.9)} 100%)`,
          backdropFilter: 'blur(16px)',
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
    // Dialogs y Modals - Glassmorphism intenso
    // =========================================================================
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: borderRadius.xl,
          background: neonEffects.glass.darkIntense.background,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(neonAccents.vividPurple, 0.3)}`,
          boxShadow: `${shadows.dark.lg}, 0 0 40px ${alpha(neonColors.primary.main, 0.25)}`,
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
          fontWeight: 600,
          padding: '24px 24px 12px',
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '12px 24px 24px',
        },
      },
    },

    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px',
          gap: 12,
        },
      },
    },

    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(neonColors.base.black, 0.75),
          backdropFilter: 'blur(8px)',
        },
      },
    },

    // =========================================================================
    // Alerts y Feedback - Con bordes y glows neón
    // =========================================================================
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.large,
          backdropFilter: 'blur(12px)',
          border: 'none',
          borderLeft: '4px solid',
        },
        standardSuccess: {
          background: `linear-gradient(90deg, ${alpha(stateColors.success.main, 0.15)}, ${alpha(stateColors.success.main, 0.05)})`,
          borderLeftColor: stateColors.success.main,
          boxShadow: `0 0 15px ${alpha(stateColors.success.main, 0.2)}`,
          '& .MuiAlert-icon': {
            color: stateColors.success.main,
            filter: `drop-shadow(0 0 4px ${alpha(stateColors.success.main, 0.5)})`,
          },
        },
        standardError: {
          background: `linear-gradient(90deg, ${alpha(stateColors.error.main, 0.15)}, ${alpha(stateColors.error.main, 0.05)})`,
          borderLeftColor: stateColors.error.main,
          boxShadow: `0 0 15px ${alpha(stateColors.error.main, 0.2)}`,
          '& .MuiAlert-icon': {
            color: stateColors.error.main,
            filter: `drop-shadow(0 0 4px ${alpha(stateColors.error.main, 0.5)})`,
          },
        },
        standardWarning: {
          background: `linear-gradient(90deg, ${alpha(stateColors.warning.main, 0.15)}, ${alpha(stateColors.warning.main, 0.05)})`,
          borderLeftColor: stateColors.warning.main,
          boxShadow: `0 0 15px ${alpha(stateColors.warning.main, 0.2)}`,
          '& .MuiAlert-icon': {
            color: stateColors.warning.main,
            filter: `drop-shadow(0 0 4px ${alpha(stateColors.warning.main, 0.5)})`,
          },
        },
        standardInfo: {
          background: `linear-gradient(90deg, ${alpha(stateColors.info.main, 0.15)}, ${alpha(stateColors.info.main, 0.05)})`,
          borderLeftColor: stateColors.info.main,
          boxShadow: `0 0 15px ${alpha(stateColors.info.main, 0.2)}`,
          '& .MuiAlert-icon': {
            color: stateColors.info.main,
            filter: `drop-shadow(0 0 4px ${alpha(stateColors.info.main, 0.5)})`,
          },
        },
      },
    },

    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiPaper-root': {
            borderRadius: borderRadius.large,
          },
        },
      },
    },

    // =========================================================================
    // Chips y Badges - Con gradientes y glow
    // =========================================================================
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: borderRadius.xxl,
          transition: 'all 0.3s ease',
        },
        filled: {
          '&.MuiChip-colorPrimary': {
            background: gradients.ocean,
            color: neonColors.base.white,
            boxShadow: `0 2px 10px ${alpha(neonColors.primary.main, 0.4)}`,
            '&:hover': {
              boxShadow: `0 4px 15px ${alpha(neonColors.primary.main, 0.5)}`,
            },
          },
          '&.MuiChip-colorSecondary': {
            background: gradients.neonPrimary,
            color: neonColors.base.white,
            boxShadow: `0 2px 10px ${alpha(neonAccents.vividPurple, 0.4)}`,
          },
          '&.MuiChip-colorSuccess': {
            background: `linear-gradient(135deg, ${stateColors.success.main}, ${stateColors.success.dark})`,
            boxShadow: `0 2px 10px ${alpha(stateColors.success.main, 0.4)}`,
          },
          '&.MuiChip-colorWarning': {
            background: `linear-gradient(135deg, ${stateColors.warning.main}, ${stateColors.warning.light})`,
            boxShadow: `0 2px 10px ${alpha(stateColors.warning.main, 0.4)}`,
          },
          '&.MuiChip-colorError': {
            background: gradients.sunset,
            boxShadow: `0 2px 10px ${alpha(stateColors.error.main, 0.4)}`,
          },
        },
        outlined: {
          borderWidth: 2,
          '&.MuiChip-colorPrimary': {
            borderColor: neonColors.primary.main,
            '&:hover': {
              backgroundColor: alpha(neonColors.primary.main, 0.1),
              boxShadow: neonEffects.glow.cyanSubtle,
            },
          },
        },
      },
    },

    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 700,
          boxShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.5)}`,
        },
      },
    },

    // =========================================================================
    // Tabs - Con indicador neón animado
    // =========================================================================
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
          background: gradients.ocean,
          boxShadow: `0 0 12px ${alpha(neonColors.primary.main, 0.7)}`,
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
            fontWeight: 600,
            textShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.5)}`,
          },
          '&:hover': {
            color: neonColors.primary.light,
            backgroundColor: alpha(neonColors.primary.main, 0.08),
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
          background: gradients.darkCard,
          backdropFilter: 'blur(12px)',
          fontSize: '0.8rem',
          fontWeight: 500,
          padding: '10px 16px',
          borderRadius: borderRadius.medium,
          boxShadow: `${shadows.dark.md}, 0 0 15px ${alpha(neonColors.primary.main, 0.2)}`,
          border: `1px solid ${alpha(neonAccents.vividPurple, 0.3)}`,
        },
        arrow: {
          color: darkSurfaces.midnightBlue,
        },
      },
    },

    // =========================================================================
    // Progress indicators - Con glow neón
    // =========================================================================
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.small,
          backgroundColor: alpha(neonColors.primary.main, 0.15),
          height: 6,
        },
        bar: {
          borderRadius: borderRadius.small,
          background: gradients.ocean,
          boxShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.6)}`,
        },
      },
    },

    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: neonColors.primary.main,
          filter: `drop-shadow(0 0 8px ${alpha(neonColors.primary.main, 0.6)})`,
        },
      },
    },

    // =========================================================================
    // Switches y Checkboxes - Con glow
    // =========================================================================
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: neonColors.primary.main,
            '& + .MuiSwitch-track': {
              backgroundColor: neonColors.primary.main,
              boxShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.6)}`,
            },
          },
          '& .MuiSwitch-thumb': {
            boxShadow: `0 0 6px ${alpha(neonColors.primary.main, 0.4)}`,
          },
        },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: neonColors.primary.main,
            filter: `drop-shadow(0 0 6px ${alpha(neonColors.primary.main, 0.6)})`,
          },
        },
      },
    },

    MuiRadio: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: neonColors.primary.main,
            filter: `drop-shadow(0 0 6px ${alpha(neonColors.primary.main, 0.6)})`,
          },
        },
      },
    },

    // =========================================================================
    // Skeleton - Con shimmer effect
    // =========================================================================
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(neonAccents.vividPurple, 0.15),
          '&::after': {
            background: `linear-gradient(90deg, transparent, ${alpha(neonColors.primary.main, 0.1)}, transparent)`,
          },
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
    // Avatar - Con glow
    // =========================================================================
    MuiAvatar: {
      styleOverrides: {
        root: {
          background: gradients.ocean,
          color: neonColors.base.white,
          fontWeight: 600,
          boxShadow: `0 0 12px ${alpha(neonColors.primary.main, 0.4)}`,
        },
      },
    },

    // =========================================================================
    // Menu
    // =========================================================================
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: borderRadius.large,
          background: gradients.darkCard,
          backdropFilter: 'blur(16px)',
          boxShadow: `${shadows.dark.lg}, ${shadows.dark.neon}`,
          border: `1px solid ${alpha(neonAccents.vividPurple, 0.3)}`,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.medium,
          margin: '4px 8px',
          padding: '10px 16px',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.15),
          },
          '&.Mui-selected': {
            background: `linear-gradient(90deg, ${alpha(neonColors.primary.main, 0.2)}, ${alpha(neonAccents.vividPurple, 0.1)})`,
            '&:hover': {
              backgroundColor: alpha(neonColors.primary.main, 0.25),
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
              textShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.6)}`,
            },
          },
        },
        separator: {
          color: alpha(neonAccents.vividPurple, 0.5),
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
            textShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.5)}`,
          },
        },
      },
    },

    // =========================================================================
    // Accordion
    // =========================================================================
    MuiAccordion: {
      styleOverrides: {
        root: {
          background: gradients.darkCard,
          borderRadius: `${borderRadius.large}px !important`,
          border: `1px solid ${alpha(neonAccents.vividPurple, 0.2)}`,
          marginBottom: 8,
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            borderColor: alpha(neonColors.primary.main, 0.4),
            boxShadow: shadows.dark.neon,
          },
        },
      },
    },

    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.large,
          '&:hover': {
            backgroundColor: alpha(neonColors.primary.main, 0.08),
          },
        },
      },
    },

    // =========================================================================
    // Slider
    // =========================================================================
    MuiSlider: {
      styleOverrides: {
        root: {
          '& .MuiSlider-thumb': {
            boxShadow: `0 0 10px ${alpha(neonColors.primary.main, 0.6)}`,
            '&:hover, &.Mui-focusVisible': {
              boxShadow: `0 0 15px ${alpha(neonColors.primary.main, 0.8)}`,
            },
          },
          '& .MuiSlider-track': {
            background: gradients.ocean,
            boxShadow: `0 0 8px ${alpha(neonColors.primary.main, 0.5)}`,
          },
          '& .MuiSlider-rail': {
            backgroundColor: alpha(neonAccents.vividPurple, 0.3),
          },
        },
      },
    },

    // =========================================================================
    // Rating
    // =========================================================================
    MuiRating: {
      styleOverrides: {
        iconFilled: {
          color: neonAccents.sunsetOrange,
          filter: `drop-shadow(0 0 4px ${alpha(neonAccents.sunsetOrange, 0.6)})`,
        },
      },
    },

    // =========================================================================
    // ToggleButton
    // =========================================================================
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: alpha(neonAccents.vividPurple, 0.3),
          '&.Mui-selected': {
            background: `linear-gradient(135deg, ${alpha(neonColors.primary.main, 0.2)}, ${alpha(neonAccents.vividPurple, 0.15)})`,
            borderColor: neonColors.primary.main,
            boxShadow: neonEffects.glow.cyanSubtle,
            '&:hover': {
              backgroundColor: alpha(neonColors.primary.main, 0.25),
            },
          },
        },
      },
    },
  },
});

export default darkTheme;
