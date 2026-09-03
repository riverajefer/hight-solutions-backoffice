/**
 * Utilidades para campos de moneda COP que admiten decimales.
 *
 * El campo agrupa los miles con punto mientras se escribe, así que el usuario no
 * necesita teclearlos; la coma (o un punto suelto) abre los decimales, máximo dos.
 *
 *   "1500000"   → "1.500.000"   (1500000)
 *   "142,85"    → "142,85"      (142.85)
 *   "142.85"    → "142,85"      (142.85)
 *   "142,"      → "142,"        (142)   ← estado intermedio mientras escribe
 *   "1.500.000" → "1.500.000"   (1500000) ← miles ya agrupados (pegado o autoformato)
 */

export const CURRENCY_MAX_DECIMALS = 2;

/**
 * Normaliza lo tecleado a un valor crudo apto para `parseFloat`
 * (solo dígitos y un punto decimal). Conserva el punto final para no bloquear
 * al usuario mientras escribe los decimales.
 *
 * Lo que llega no es lo que el usuario tecleó, sino el texto ya formateado con
 * puntos de miles más su última tecla, así que hay que decidir qué separador es
 * el decimal:
 *  - Si hay coma, esa manda: el display solo usa coma para decimales.
 *  - Si solo hay puntos, el último abre decimales cuando lo que le sigue cabe en
 *    `maxDecimals`; si le siguen más dígitos no puede ser un decimal y todos los
 *    puntos son separadores de miles ("1.0000" es 10.000, no 1,00).
 */
export const sanitizeCurrencyInput = (
  value: string | number,
  maxDecimals: number = CURRENCY_MAX_DECIMALS
): string => {
  const str = typeof value === 'number' ? String(value) : value ?? '';
  const cleaned = str.replace(/[^\d.,]/g, '');
  const stripLeadingZeros = (digits: string) => digits.replace(/^0+(?=\d)/, '');

  const decimalIndex = cleaned.includes(',')
    ? cleaned.lastIndexOf(',')
    : cleaned.lastIndexOf('.');

  if (decimalIndex === -1) {
    return stripLeadingZeros(cleaned);
  }

  const trailing = cleaned.slice(decimalIndex + 1).replace(/\D/g, '');
  const isThousandsSeparator = !cleaned.includes(',') && trailing.length > maxDecimals;

  if (isThousandsSeparator) {
    return stripLeadingZeros(cleaned.replace(/\D/g, ''));
  }

  const integerPart = stripLeadingZeros(cleaned.slice(0, decimalIndex).replace(/\D/g, ''));

  return `${integerPart}.${trailing.slice(0, maxDecimals)}`;
};

/**
 * Formatea el valor para mostrarlo en el input: miles con punto y decimales
 * con coma, según la convención colombiana.
 */
export const formatCurrencyInput = (
  value: string | number,
  maxDecimals: number = CURRENCY_MAX_DECIMALS
): string => {
  const raw = sanitizeCurrencyInput(value, maxDecimals);
  if (!raw) return '';

  const [integerPart, decimalPart] = raw.split('.');
  const integer = new Intl.NumberFormat('es-CO').format(Number(integerPart || '0'));

  return decimalPart === undefined ? integer : `${integer},${decimalPart}`;
};

/** Redondea a la cantidad de decimales soportada por la BD (Decimal(12,2)). */
export const roundCurrency = (
  value: number,
  maxDecimals: number = CURRENCY_MAX_DECIMALS
): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** maxDecimals;
  return Math.round(value * factor) / factor;
};

/** Convierte lo tecleado (o el valor crudo guardado) a número. Devuelve 0 si no es válido. */
export const parseCurrencyInput = (
  value: string | number,
  maxDecimals: number = CURRENCY_MAX_DECIMALS
): number => {
  if (typeof value === 'number') return roundCurrency(value, maxDecimals);
  const parsed = parseFloat(sanitizeCurrencyInput(value, maxDecimals));
  return Number.isFinite(parsed) ? roundCurrency(parsed, maxDecimals) : 0;
};

/**
 * Convierte un valor que viene de la API (Decimal serializado, p. ej. "1500.00")
 * al valor crudo que espera el input, sin decimales sobrantes.
 */
export const toCurrencyInputValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(num)) return '';
  return String(roundCurrency(num));
};
