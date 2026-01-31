/**
 * Tokens de colores para el tema Neón Elegante con Degradados
 * Paleta vibrante con efectos neón pronunciados para ambos modos
 */

// =============================================================================
// COLORES BASE DEL PROYECTO
// =============================================================================

export const neonColors = {
  // Primary - Neón Cyan
  primary: {
    main: '#2EB0C4',
    light: '#C1E3EE',
    dark: '#1A8A9A',
    contrastText: '#FFFFFF',
  },

  // Secondary - Deep Indigo
  secondary: {
    main: '#363A72',
    light: '#5A5F9E',
    dark: '#252850',
    contrastText: '#FFFFFF',
  },

  // Base colors
  base: {
    voidBlack: '#010100',
    charcoal: '#2D2D2D',
    black: '#000000',
    white: '#FFFFFF',
  },
} as const;

// =============================================================================
// COLORES NEÓN ADICIONALES (ACENTOS VIBRANTES)
// =============================================================================

export const neonAccents = {
  electricCyan: '#00FFFF',
  neonMagenta: '#FF2D95',
  vividPurple: '#8B5CF6',
  electricViolet: '#7C3AED',
  hotPink: '#EC4899',
  neonGreen: '#22D3EE',
  sunsetOrange: '#F97316',
} as const;

// =============================================================================
// COLORES PARA SUPERFICIES Y PROFUNDIDAD (DARK MODE)
// =============================================================================

export const darkSurfaces = {
  deepSpace: '#0A0A1A',
  midnightBlue: '#1A1A2E',
  navyMist: '#16213E',
  twilight: '#1E2A4A',
  cosmicPurple: '#2D1B4E',
} as const;

// =============================================================================
// COLORES PARA SUPERFICIES (LIGHT MODE)
// =============================================================================

export const lightSurfaces = {
  snow: '#FAFBFC',
  cloud: '#F1F5F9',
  mist: '#E2E8F0',
  lavenderTint: '#EDE9FE',
  cyanTint: '#ECFEFF',
} as const;

// =============================================================================
// COLORES DE ESTADO
// =============================================================================

export const stateColors = {
  success: {
    main: '#22D3EE',
    light: '#67E8F9',
    dark: '#10B981',
    contrastText: '#000000',
  },
  warning: {
    main: '#F97316',
    light: '#FBBF24',
    dark: '#EA580C',
    contrastText: '#000000',
  },
  error: {
    main: '#FF2D95',
    light: '#FF8A80',
    dark: '#EF4444',
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
    paper: '#1A1A2E',
    surface: '#16213E',
    elevated: '#1E2A4A',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#C1E3EE',
    disabled: 'rgba(255, 255, 255, 0.5)',
    muted: 'rgba(193, 227, 238, 0.6)',
  },
  divider: 'rgba(139, 92, 246, 0.2)',
  border: 'rgba(139, 92, 246, 0.2)',
  action: {
    active: '#2EB0C4',
    hover: 'rgba(46, 176, 196, 0.12)',
    selected: 'rgba(46, 176, 196, 0.2)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
  },
} as const;

export const lightModeColors = {
  background: {
    default: '#FFFFFF',
    paper: '#FAFBFC',
    surface: '#F1F5F9',
    elevated: '#FFFFFF',
  },
  text: {
    primary: '#010100',
    secondary: '#363A72',
    disabled: 'rgba(0, 0, 0, 0.38)',
    muted: 'rgba(54, 58, 114, 0.6)',
  },
  divider: 'rgba(54, 58, 114, 0.15)',
  border: '#E2E8F0',
  action: {
    active: '#2EB0C4',
    hover: 'rgba(46, 176, 196, 0.08)',
    selected: 'rgba(46, 176, 196, 0.12)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
  },
} as const;

// =============================================================================
// DEGRADADOS PRINCIPALES
// =============================================================================

export const gradients = {
  // Degradados Neón (Para botones, headers, elementos destacados)
  neonPrimary: 'linear-gradient(135deg, #2EB0C4 0%, #8B5CF6 50%, #FF2D95 100%)',
  neonHorizontal: 'linear-gradient(90deg, #00FFFF 0%, #2EB0C4 25%, #7C3AED 75%, #FF2D95 100%)',
  neonVertical: 'linear-gradient(180deg, #363A72 0%, #8B5CF6 50%, #2EB0C4 100%)',
  sunset: 'linear-gradient(135deg, #F97316 0%, #EC4899 50%, #8B5CF6 100%)',
  ocean: 'linear-gradient(135deg, #22D3EE 0%, #2EB0C4 50%, #363A72 100%)',

  // Degradados para fondos Dark Mode
  darkBackground: 'linear-gradient(135deg, #010100 0%, #1A1A2E 50%, #0A0A1A 100%)',
  darkNeonTint: 'linear-gradient(180deg, #010100 0%, #16213E 50%, #1A1A2E 100%)',
  darkSidebar: 'linear-gradient(180deg, #1A1A2E 0%, #2D1B4E 100%)',
  darkCard: 'linear-gradient(145deg, #1A1A2E 0%, #16213E 100%)',
  darkMesh: `
    radial-gradient(ellipse at 20% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(46, 176, 196, 0.15) 0%, transparent 50%),
    linear-gradient(135deg, #010100 0%, #1A1A2E 100%)
  `,

  // Degradados para fondos Light Mode
  lightBackground: 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 50%, #FAFBFC 100%)',
  lightTinted: 'linear-gradient(180deg, #FFFFFF 0%, #ECFEFF 50%, #EDE9FE 100%)',
  lightCard: 'linear-gradient(145deg, #FFFFFF 0%, #F1F5F9 100%)',
  lightMesh: `
    radial-gradient(ellipse at 20% 0%, rgba(46, 176, 196, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
    linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)
  `,

  // Degradados para Headers de tablas
  tableHeaderDark: 'linear-gradient(90deg, #24263D 0%, #1F2135 100%)',
  tableHeaderLight: 'linear-gradient(90deg, rgba(46, 176, 196, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
} as const;

// =============================================================================
// EFECTOS NEÓN MEJORADOS
// =============================================================================

export const neonEffects = {
  // Glow Effects
  glow: {
    cyan: `
      0 0 5px #2EB0C4,
      0 0 10px #2EB0C4,
      0 0 20px rgba(46, 176, 196, 0.8),
      0 0 40px rgba(46, 176, 196, 0.6),
      0 0 60px rgba(46, 176, 196, 0.4)
    `,
    cyanSubtle: `
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
      0 0 5px #FF2D95,
      0 0 10px #FF2D95,
      0 0 20px rgba(255, 45, 149, 0.8),
      0 0 40px rgba(255, 45, 149, 0.6)
    `,
    purple: `
      0 0 5px #8B5CF6,
      0 0 10px #8B5CF6,
      0 0 20px rgba(139, 92, 246, 0.8),
      0 0 40px rgba(139, 92, 246, 0.6)
    `,
    multi: `
      0 0 10px #2EB0C4,
      0 0 20px rgba(139, 92, 246, 0.6),
      0 0 30px rgba(255, 45, 149, 0.4)
    `,
  },

  // Text Glow
  textGlow: {
    cyan: `
      0 0 5px #2EB0C4,
      0 0 10px #2EB0C4,
      0 0 20px rgba(46, 176, 196, 0.8)
    `,
    magenta: `
      0 0 5px rgba(255, 45, 149, 0.5),
      0 0 10px rgba(255, 45, 149, 0.3)
    `,
    purple: `
      0 0 5px rgba(139, 92, 246, 0.5),
      0 0 10px rgba(139, 92, 246, 0.3)
    `,
  },

  // Glassmorphism
  glass: {
    dark: {
      background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(45, 27, 78, 0.6) 100%)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
    },
    darkIntense: {
      background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.9) 0%, rgba(22, 33, 62, 0.8) 100%)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(46, 176, 196, 0.3)',
    },
    light: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(241, 245, 249, 0.8) 100%)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(46, 176, 196, 0.2)',
    },
  },

  // Gradientes para bordes
  borderGradient: {
    neon: 'linear-gradient(90deg, #2EB0C4, #8B5CF6, #FF2D95, #2EB0C4)',
    static: 'linear-gradient(135deg, #2EB0C4 0%, #8B5CF6 100%)',
    ocean: 'linear-gradient(135deg, #22D3EE 0%, #2EB0C4 100%)',
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
  smooth: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  xl: 16,
  xxl: 20,
  round: '50%',
} as const;

// =============================================================================
// SOMBRAS CON TINTE DE COLOR
// =============================================================================

export const shadows = {
  light: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
    md: '0 4px 12px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
    neon: '0 4px 20px rgba(46, 176, 196, 0.15)',
    neonHover: '0 10px 40px rgba(46, 176, 196, 0.2)',
  },
  dark: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.4)',
    md: '0 4px 12px rgba(0, 0, 0, 0.5)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.6)',
    neon: '0 4px 20px rgba(46, 176, 196, 0.2)',
    neonHover: '0 0 30px rgba(46, 176, 196, 0.3)',
    card: '0 10px 40px rgba(0, 0, 0, 0.3)',
  },
} as const;

// =============================================================================
// CSS KEYFRAMES (para usar con styled-components o sx prop)
// =============================================================================

export const keyframes = {
  neonPulse: `
    @keyframes neonPulse {
      0%, 100% {
        box-shadow:
          0 0 5px #2EB0C4,
          0 0 10px #2EB0C4,
          0 0 20px rgba(46, 176, 196, 0.6);
      }
      50% {
        box-shadow:
          0 0 10px #2EB0C4,
          0 0 20px #2EB0C4,
          0 0 40px rgba(46, 176, 196, 0.8),
          0 0 60px rgba(139, 92, 246, 0.4);
      }
    }
  `,
  gradientShift: `
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
  float: `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
  `,
  borderRotate: `
    @keyframes borderRotate {
      0% { background-position: 0% 0%; }
      100% { background-position: 100% 0%; }
    }
  `,
} as const;
