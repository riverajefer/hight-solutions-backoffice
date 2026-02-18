/**
 * Utilidades para diseño responsive
 * Centraliza breakpoints y spacing para mantener consistencia en toda la aplicación
 */

import type { SxProps, Theme } from '@mui/material';

/**
 * Breakpoints personalizados basados en Material UI
 * - xs: 0-599px (Mobile)
 * - sm: 600-959px (Tablet vertical)
 * - md: 960-1279px (Tablet horizontal / Desktop pequeño)
 * - lg: 1280-1919px (Desktop)
 * - xl: 1920px+ (Desktop grande)
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

/**
 * Valores de spacing responsive para componentes comunes
 */
export const responsiveSpacing = {
  /** Spacing pequeño: 12px/16px/20px */
  small: { xs: 1.5, sm: 2, md: 2.5 },

  /** Spacing medio: 16px/20px/24px */
  medium: { xs: 2, sm: 2.5, md: 3 },

  /** Spacing grande: 24px/28px/32px */
  large: { xs: 3, sm: 3.5, md: 4 },

  /** Spacing extra grande: 32px/40px/48px */
  xlarge: { xs: 4, sm: 5, md: 6 },
} as const;

/**
 * Valores de padding responsive para Cards y contenedores
 */
export const responsivePadding = {
  /** Padding pequeño para componentes compactos */
  compact: { xs: 1.5, sm: 2, md: 2.5 },

  /** Padding normal para Cards y contenedores */
  normal: { xs: 2, sm: 2.5, md: 3 },

  /** Padding grande para secciones principales */
  large: { xs: 2.5, sm: 3, md: 4 },
} as const;

/**
 * Tamaños de fuente responsive
 */
export const responsiveFontSize = {
  /** Título principal (h4) */
  title: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },

  /** Subtítulo (h6) */
  subtitle: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },

  /** Body pequeño */
  bodySmall: { xs: '0.813rem', sm: '0.875rem' },

  /** Body normal */
  body: { xs: '0.875rem', sm: '1rem' },

  /** Caption */
  caption: { xs: '0.688rem', sm: '0.75rem' },
} as const;

/**
 * Anchos mínimos responsive para inputs y componentes de formulario
 */
export const responsiveMinWidth = {
  /** Input de búsqueda */
  search: { xs: '100%', sm: '200px', md: '280px' },

  /** Input de formulario */
  input: { xs: '100%', sm: '250px', md: '300px' },

  /** Select/Autocomplete */
  select: { xs: '100%', sm: '180px', md: '220px' },
} as const;

/**
 * Anchos máximos responsive
 */
export const responsiveMaxWidth = {
  /** Búsqueda en toolbar */
  search: { xs: '100%', sm: '100%', md: '500px' },

  /** Diálogos */
  dialog: { xs: 'calc(100% - 32px)', sm: 'sm' },
} as const;

/**
 * Gaps responsive para flex y grid
 */
export const responsiveGap = {
  /** Gap pequeño */
  small: { xs: 1, sm: 1.5, md: 2 },

  /** Gap medio */
  medium: { xs: 1.5, sm: 2, md: 2.5 },

  /** Gap grande */
  large: { xs: 2, sm: 2.5, md: 3 },
} as const;

/**
 * Helper para crear SxProps responsive rápidamente
 */
export const createResponsiveStyles = (config: {
  padding?: keyof typeof responsivePadding;
  spacing?: keyof typeof responsiveSpacing;
  gap?: keyof typeof responsiveGap;
  fontSize?: keyof typeof responsiveFontSize;
}): SxProps<Theme> => {
  const styles: any = {};

  if (config.padding) {
    styles.p = responsivePadding[config.padding];
  }

  if (config.spacing) {
    // Nota: spacing se usa típicamente en Grid/Stack, no en sx directamente
    // Este campo está aquí para referencia
  }

  if (config.gap) {
    styles.gap = responsiveGap[config.gap];
  }

  if (config.fontSize) {
    styles.fontSize = responsiveFontSize[config.fontSize];
  }

  return styles as SxProps<Theme>;
};

/**
 * Ejemplo de uso:
 *
 * // En un componente Grid
 * <Grid container spacing={responsiveSpacing.medium}>
 *
 * // En un Card
 * <Card>
 *   <CardContent sx={{ p: responsivePadding.normal }}>
 *
 * // En un Stack
 * <Stack spacing={responsiveSpacing.large} gap={responsiveGap.medium}>
 *
 * // En un TextField de búsqueda
 * <TextField
 *   sx={{
 *     minWidth: responsiveMinWidth.search,
 *     maxWidth: responsiveMaxWidth.search,
 *   }}
 * />
 *
 * // Usando el helper
 * <Box sx={createResponsiveStyles({ padding: 'normal', gap: 'medium' })}>
 */
