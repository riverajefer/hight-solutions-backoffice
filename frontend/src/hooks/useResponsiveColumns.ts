import { useMemo } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { GridColDef, GridValidRowModel } from '@mui/x-data-grid';

/**
 * Breakpoint mínimo en el que se muestra la columna.
 * - 'always': se muestra en todos los breakpoints
 * - 'xs': se muestra desde xs (siempre, equivalente a 'always')
 * - 'sm': se muestra desde sm (≥600px), oculta en xs
 * - 'md': se muestra desde md (≥960px), oculta en xs y sm
 * - 'lg': se muestra desde lg (≥1280px), oculta en xs, sm y md
 */
export type ResponsiveBreakpoint = 'always' | 'xs' | 'sm' | 'md' | 'lg';

export type ResponsiveGridColDef<R extends GridValidRowModel = any> = GridColDef<R> & {
  /**
   * Breakpoint mínimo a partir del cual se muestra esta columna.
   * Si no se especifica, la columna se muestra siempre.
   */
  responsive?: ResponsiveBreakpoint;
};

/**
 * Hook que filtra columnas del DataGrid según el breakpoint actual.
 * Permite ocultar columnas menos importantes en pantallas pequeñas.
 *
 * @example
 * const columns = useResponsiveColumns([
 *   { field: 'name', headerName: 'Nombre', flex: 1 },                          // siempre visible
 *   { field: 'email', headerName: 'Email', flex: 1, responsive: 'sm' },        // oculta en xs
 *   { field: 'phone', headerName: 'Teléfono', width: 140, responsive: 'md' },  // oculta en xs y sm
 * ]);
 */
export function useResponsiveColumns<R extends GridValidRowModel = any>(columns: ResponsiveGridColDef<R>[]): GridColDef<R>[] {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'));

  return useMemo(() => {
    return columns.filter((col) => {
      const bp = col.responsive;
      if (!bp || bp === 'always' || bp === 'xs') return true;
      if (bp === 'sm') return isSmUp;
      if (bp === 'md') return isMdUp;
      if (bp === 'lg') return isLgUp;
      return true;
    });
  }, [columns, isSmUp, isMdUp, isLgUp]);
}
