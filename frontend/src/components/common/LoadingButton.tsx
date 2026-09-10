import React, { forwardRef } from 'react';
import {
  Button,
  ButtonProps,
  CircularProgress,
  IconButton,
  IconButtonProps,
  Tooltip,
  Box,
} from '@mui/material';

/**
 * Tamaño del spinner según el tamaño del botón.
 *
 * `verySmall` es una variante propia del proyecto, declarada en
 * `types/mui.d.ts`; si no está en el mapa, TypeScript se queja.
 */
const SPINNER_SIZE: Record<string, number> = {
  verySmall: 12,
  small: 16,
  medium: 18,
  large: 20,
};

const spinnerSize = (size: ButtonProps['size']): number =>
  SPINNER_SIZE[size ?? 'medium'] ?? 18;

/**
 * Props que `Tooltip` le inyecta a su hijo al clonarlo.
 *
 * Tienen que quedar en el **mismo** elemento que recibe el `ref` — el `<span>`
 * externo — o MUI advierte que el hijo no reenvía sus props y el tooltip no
 * aparece.
 */
const TOOLTIP_PROPS = [
  'onMouseOver',
  'onMouseEnter',
  'onMouseLeave',
  'onMouseMove',
  'onFocus',
  'onBlur',
  'onTouchStart',
  'onTouchEnd',
  'aria-describedby',
  'title',
  // Marcador que Tooltip le pone al hijo y luego busca en el nodo del `ref`
  // para verificar que props y ref quedaron juntos (Tooltip.js:470).
  'data-mui-internal-clone-element',
] as const;

type AnyProps = Record<string, unknown>;

/** Separa lo que va en el `<span>` de lo que va en el botón. */
function splitTooltipProps(props: AnyProps): [AnyProps, AnyProps] {
  const forWrapper: AnyProps = {};
  const forButton: AnyProps = { ...props };
  for (const key of TOOLTIP_PROPS) {
    if (key in forButton) {
      forWrapper[key] = forButton[key];
      delete forButton[key];
    }
  }
  return [forWrapper, forButton];
}

export interface LoadingButtonProps extends Omit<ButtonProps, 'disabled'> {
  /** Mientras es `true` el botón gira y no se puede volver a presionar. */
  loading?: boolean;
  disabled?: boolean;
  /** Tooltip propio. Si el botón ya viene envuelto en un `<Tooltip>`, no lo uses. */
  tooltip?: React.ReactNode;
  /**
   * No envolver en el `<span>` externo. Solo para los casos donde el nodo extra
   * rompe el layout (un `flex: 1`, un `ButtonGroup`). Ojo: sin el span, un
   * `<Tooltip>` que envuelva este botón vuelve a advertir en consola.
   */
  disableWrapper?: boolean;
}

/**
 * Botón que muestra un spinner mientras su acción está en vuelo.
 *
 * Existe porque el usuario no tenía forma de saber que el servidor estaba
 * procesando: el botón se veía igual antes y durante la petición, así que
 * volvía a dar clic. Reemplaza el patrón copiado a mano por todo el frontend
 * (`startIcon={x ? <CircularProgress/> : <Icon/>}`).
 *
 * Dos detalles que no son obvios:
 *
 * 1. **El ancho no salta.** Si el botón tiene ícono, el spinner ocupa esa misma
 *    ranura. Si no lo tiene, el label se queda montado (invisible) y el spinner
 *    va encima en absoluto — el tema ya pone `position: relative` en
 *    `MuiButton.root`, así que no hace falta tocarlo.
 * 2. **El `<span>` externo no es decorativo.** Un botón deshabilitado no emite
 *    eventos de mouse, así que un `<Tooltip>` que lo envuelva deja de funcionar
 *    y MUI advierte en consola. El span recibe el `ref` y los handlers que
 *    Tooltip le inyecta al clonar su hijo, y así los tooltips que ya existen en
 *    las páginas siguen andando sin tocar ni un call-site.
 *
 * Esto **no** sustituye a `useSingleFlight`: `disabled` solo se aplica en el
 * siguiente render, así que dos clics en el mismo frame entran igual. El
 * spinner es el aviso al usuario; el candado sigue siendo del handler.
 *
 * @example
 * <LoadingButton loading={saveMutation.isPending} onClick={handleSave}>
 *   Guardar
 * </LoadingButton>
 */
export const LoadingButton = forwardRef<HTMLDivElement, LoadingButtonProps>(
  (
    {
      loading = false,
      disabled = false,
      tooltip,
      disableWrapper = false,
      startIcon,
      endIcon,
      children,
      size,
      fullWidth,
      sx,
      ...rest
    },
    ref,
  ) => {
    const [wrapperProps, buttonProps] = splitTooltipProps(rest as AnyProps);

    // Sin `aria-label`: si lo llevara, se sumaría al nombre accesible del
    // botón ("Confirmar Procesando"). Quien anuncia el estado es `aria-busy`.
    const spinner = <CircularProgress size={spinnerSize(size)} color="inherit" />;

    // Con ícono el spinner toma su lugar; sin ícono va superpuesto para que el
    // label no cambie de ancho al aparecer.
    const hasIcon = Boolean(startIcon || endIcon);
    const overlay = loading && !hasIcon;

    const button = (
      <Button
        {...buttonProps}
        size={size}
        fullWidth={fullWidth}
        disabled={loading || disabled}
        aria-busy={loading}
        startIcon={loading && startIcon ? spinner : startIcon}
        endIcon={loading && endIcon && !startIcon ? spinner : endIcon}
        sx={sx}
      >
        <Box component="span" sx={{ color: overlay ? 'transparent' : 'inherit' }}>
          {children}
        </Box>
        {overlay && (
          <Box
            component="span"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'inline-flex',
            }}
          >
            {spinner}
          </Box>
        )}
      </Button>
    );

    if (disableWrapper) {
      return tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button;
    }

    const wrapped = (
      <Box
        component="span"
        ref={ref}
        {...wrapperProps}
        sx={{
          display: 'inline-flex',
          width: fullWidth ? '100%' : 'auto',
        }}
      >
        {button}
      </Box>
    );

    return tooltip ? <Tooltip title={tooltip}>{wrapped}</Tooltip> : wrapped;
  },
);

LoadingButton.displayName = 'LoadingButton';

export interface IconLoadingButtonProps extends Omit<IconButtonProps, 'disabled'> {
  loading?: boolean;
  disabled?: boolean;
  loadingLabel?: string;
  tooltip?: React.ReactNode;
}

/**
 * Versión para acciones de ícono (celdas de tabla, barras de herramientas).
 *
 * El `IconButton` tiene padding fijo, así que cambiar el ícono por el spinner
 * no mueve nada de sitio. Mismo truco del `<span>` para que el tooltip siga
 * funcionando con el botón deshabilitado.
 */
export const IconLoadingButton = forwardRef<HTMLDivElement, IconLoadingButtonProps>(
  (
    {
      loading = false,
      disabled = false,
      loadingLabel = 'Procesando',
      tooltip,
      children,
      size,
      ...rest
    },
    ref,
  ) => {
    const [wrapperProps, buttonProps] = splitTooltipProps(rest as AnyProps);

    const button = (
      <IconButton
        {...buttonProps}
        size={size}
        disabled={loading || disabled}
        aria-busy={loading}
      >
        {loading ? (
          <CircularProgress
            size={size === 'small' ? 16 : 20}
            color="inherit"
            aria-label={loadingLabel}
          />
        ) : (
          children
        )}
      </IconButton>
    );

    const wrapped = (
      <Box component="span" ref={ref} {...wrapperProps} sx={{ display: 'inline-flex' }}>
        {button}
      </Box>
    );

    return tooltip ? <Tooltip title={tooltip}>{wrapped}</Tooltip> : wrapped;
  },
);

IconLoadingButton.displayName = 'IconLoadingButton';
