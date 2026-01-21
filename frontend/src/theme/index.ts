/**
 * Sistema de Theming - Estilo Neón Moderno
 *
 * Este archivo exporta:
 * - lightTheme: Tema claro con efectos neón suaves
 * - darkTheme: Tema oscuro con efectos neón intensos y glassmorphism
 * - Colores y tokens de diseño para uso en componentes
 * - Efectos y utilidades CSS
 */

// Temas principales
export { lightTheme } from './lightTheme';
export { darkTheme } from './darkTheme';

// Colores y tokens de diseño
export {
  neonColors,
  neonAccents,
  stateColors,
  darkModeColors,
  lightModeColors,
  neonEffects,
  transitions,
  borderRadius,
  shadows,
} from './colors';

// Re-exportar tipos útiles de MUI
export type { Theme } from '@mui/material/styles';
