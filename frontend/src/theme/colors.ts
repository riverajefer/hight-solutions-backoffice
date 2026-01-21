/**
 * Tokens de colores para el tema Neón Moderno
 * Este archivo centraliza todos los colores del sistema de diseño
 */

// =============================================================================
// COLORES PRINCIPALES
// =============================================================================

export const neonColors = {
  // Primary - Neón Cyan
  primary: {
    main: '#2EB0C4',
    light: '#C1E3EE',
    dark: '#1A8A9A',
    contrastText: '#FFFFFF',
  },

  // Secondary - Deep Blue
  secondary: {
    main: '#363A72',
    light: '#5A5F9E',
    dark: '#252850',
    contrastText: '#FFFFFF',
  },

  // Base colors
  base: {
    dark: '#010100',
    neutralDark: '#2D2D2D',
    black: '#000000',
    white: '#FFFFFF',
  },
} as const;

// =============================================================================
// COLORES NEÓN PARA ACENTOS
// =============================================================================

export const neonAccents = {
  magenta: '#FF2D95',
  purple: '#B14EFF',
  green: '#39FF14',
  blue: '#00D4FF',
  orange: '#FF6B2C',
} as const;

// =============================================================================
// COLORES DE ESTADO
// =============================================================================

export const stateColors = {
  success: {
    main: '#00E676',
    light: '#69F0AE',
    dark: '#00C853',
    contrastText: '#000000',
  },
  warning: {
    main: '#FFAB00',
    light: '#FFD740',
    dark: '#FF8F00',
    contrastText: '#000000',
  },
  error: {
    main: '#FF5252',
    light: '#FF8A80',
    dark: '#D50000',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#2EB0C4',
    light: '#C1E3EE',
    dark: '#1A8A9A',
    contrastText: '#FFFFFF',
  },
} as const;

// =============================================================================
// CONFIGURACIÓN DE MODOS (DARK/LIGHT)
// =============================================================================

export const darkModeColors = {
  background: {
    default: '#010100',
    paper: '#2D2D2D',
    surface: 'rgba(54, 58, 114, 0.3)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#C1E3EE',
    disabled: 'rgba(255, 255, 255, 0.5)',
  },
  divider: 'rgba(46, 176, 196, 0.3)',
  border: 'rgba(46, 176, 196, 0.3)',
  action: {
    active: '#2EB0C4',
    hover: 'rgba(46, 176, 196, 0.08)',
    selected: 'rgba(46, 176, 196, 0.16)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
  },
} as const;

export const lightModeColors = {
  background: {
    default: '#FFFFFF',
    paper: '#FAFCFD',
    surface: 'rgba(193, 227, 238, 0.3)',
  },
  text: {
    primary: '#010100',
    secondary: '#363A72',
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
  divider: 'rgba(54, 58, 114, 0.2)',
  border: 'rgba(54, 58, 114, 0.2)',
  action: {
    active: '#2EB0C4',
    hover: 'rgba(46, 176, 196, 0.08)',
    selected: 'rgba(46, 176, 196, 0.16)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
  },
} as const;

// =============================================================================
// EFECTOS NEÓN (para usar con sx prop o CSS-in-JS)
// =============================================================================

export const neonEffects = {
  // Glow effects para diferentes colores
  glow: {
    cyan: `
      0 0 5px rgba(46, 176, 196, 0.5),
      0 0 10px rgba(46, 176, 196, 0.3),
      0 0 20px rgba(46, 176, 196, 0.2)
    `,
    cyanIntense: `
      0 0 5px rgba(46, 176, 196, 0.8),
      0 0 10px rgba(46, 176, 196, 0.6),
      0 0 20px rgba(46, 176, 196, 0.4),
      0 0 40px rgba(46, 176, 196, 0.2)
    `,
    magenta: `
      0 0 5px rgba(255, 45, 149, 0.5),
      0 0 10px rgba(255, 45, 149, 0.3),
      0 0 20px rgba(255, 45, 149, 0.2)
    `,
    purple: `
      0 0 5px rgba(177, 78, 255, 0.5),
      0 0 10px rgba(177, 78, 255, 0.3),
      0 0 20px rgba(177, 78, 255, 0.2)
    `,
  },

  // Text shadow para efecto neón en texto
  textGlow: {
    cyan: `
      0 0 5px rgba(46, 176, 196, 0.5),
      0 0 10px rgba(46, 176, 196, 0.3)
    `,
    magenta: `
      0 0 5px rgba(255, 45, 149, 0.5),
      0 0 10px rgba(255, 45, 149, 0.3)
    `,
  },

  // Glassmorphism
  glass: {
    dark: {
      background: 'rgba(45, 45, 45, 0.7)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(46, 176, 196, 0.2)',
    },
    light: {
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(54, 58, 114, 0.15)',
    },
  },

  // Gradientes
  gradients: {
    neonPrimary: 'linear-gradient(135deg, #2EB0C4 0%, #363A72 100%)',
    neonAccent: 'linear-gradient(135deg, #2EB0C4 0%, #363A72 50%, #FF2D95 100%)',
    neonPurple: 'linear-gradient(135deg, #2EB0C4 0%, #B14EFF 100%)',
    darkSurface: 'linear-gradient(180deg, #2D2D2D 0%, #010100 100%)',
  },
} as const;

// =============================================================================
// TRANSICIONES Y ANIMACIONES
// =============================================================================

export const transitions = {
  fast: '0.15s ease',
  normal: '0.3s ease',
  slow: '0.5s ease',
  bounce: '0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  xl: 16,
  round: '50%',
} as const;

// =============================================================================
// SOMBRAS
// =============================================================================

export const shadows = {
  light: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
    md: '0 4px 12px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
  dark: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
  },
} as const;
