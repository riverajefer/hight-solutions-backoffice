import { Tooltip, Typography } from '@mui/material';
import type { TypographyProps } from '@mui/material';
import type { ReactNode } from 'react';

interface TruncatedTextProps extends Omit<TypographyProps, 'children'> {
  /** Texto a mostrar (y, por defecto, contenido del tooltip). */
  text: ReactNode;
  /** Número máximo de líneas antes de truncar con "...". Default: 1. */
  maxLines?: number;
  /** Título del tooltip. Si no se pasa, usa `text` cuando es string. */
  tooltipTitle?: ReactNode;
  /** Mostrar tooltip con el contenido completo al pasar el cursor. Default: true. */
  showTooltip?: boolean;
}

/**
 * Typography con truncado responsivo (ellipsis "...") y tooltip opcional para
 * no perder información cuando el texto no cabe en su contenedor.
 *
 * - `maxLines={1}`  → una línea con `text-overflow: ellipsis`.
 * - `maxLines>1`    → recorte multilínea con `-webkit-line-clamp`.
 *
 * Nota: para que el truncado de una línea funcione, el contenedor padre debe
 * poder encogerse (añade `minWidth: 0` al padre flex cuando sea necesario).
 */
export const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxLines = 1,
  tooltipTitle,
  showTooltip = true,
  sx,
  ...props
}) => {
  const truncationSx =
    maxLines === 1
      ? {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
        }
      : {
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        };

  const content = (
    <Typography
      {...props}
      sx={{
        minWidth: 0,
        ...truncationSx,
        ...sx,
      }}
    >
      {text}
    </Typography>
  );

  const resolvedTitle =
    tooltipTitle ?? (typeof text === 'string' ? text : undefined);

  if (showTooltip && resolvedTitle) {
    return (
      <Tooltip title={resolvedTitle} enterTouchDelay={0}>
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default TruncatedText;
