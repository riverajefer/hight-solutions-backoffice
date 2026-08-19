/**
 * Normalización de nombres y documentos para detección de duplicados.
 *
 * Lo usan tanto los scripts de saneamiento (`scripts/detect-duplicate-parties.ts`)
 * como la validación en caliente de `clients.service.ts` / `suppliers.service.ts`,
 * para que el criterio del reporte y el del formulario sean literalmente el mismo.
 */

/** Sufijos societarios que no distinguen a una empresa de sí misma. */
const LEGAL_SUFFIXES = [
  'sas',
  's a s',
  'sa',
  's a',
  'ltda',
  'limitada',
  'eu',
  'e u',
  'cia',
  'y cia',
  'zomac',
  'sca',
  'bic',
];

/**
 * minúsculas, sin tildes, sin puntuación, espacios colapsados.
 * "CONTACTO GRAFICO S.A.S." → "contacto grafico s a s"
 */
export function normName(value?: string | null): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    // Marcas diacríticas combinantes: quita tildes y la virgulilla de la ñ.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * `normName` sin sufijos societarios al final.
 * Es lo que empareja "DM PROMOCIONALES" con "DM PROMOCIONALES SAS".
 *
 * Solo se quitan del final, y nunca si dejarían el nombre vacío: hay proveedores
 * que se llaman literalmente "SA".
 */
export function nameCore(value?: string | null): string {
  let out = normName(value);
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      if (out.endsWith(` ${suffix}`)) {
        const trimmed = out.slice(0, -(suffix.length + 1)).trim();
        if (trimmed.length > 0) {
          out = trimmed;
          changed = true;
          break;
        }
      }
    }
  }
  return out;
}

/**
 * Placeholders que los usuarios escriben cuando no tienen el documento a mano.
 *
 * En producción hay 37 proveedores sin relación entre sí compartiendo NITs como
 * `1111111111`. Tratarlos como llave de identidad los fusionaría a todos, así que
 * `normDoc` los descarta y devuelve cadena vacía.
 */
function isPlaceholderDoc(digits: string): boolean {
  if (digits.length < 6) return true;
  // Un solo dígito repetido: 000000, 1111111111, 999999999.
  if (/^(\d)\1+$/.test(digits)) return true;
  // Secuencias obvias de relleno.
  if (/^01234567|^12345678|^98765432/.test(digits)) return true;
  return false;
}

/**
 * Documento comparable: solo dígitos de `nit` o, si no hay, de `cedula`.
 * Conserva el dígito de verificación si venía pegado; para comparar identidad
 * usá `docCore`, que lo quita.
 *
 * Devuelve '' cuando no hay documento utilizable.
 */
export function normDoc(nit?: string | null, cedula?: string | null): string {
  const raw = (nit && nit.trim()) || (cedula && cedula.trim()) || '';
  const digits = raw.replace(/\D/g, '');
  if (!digits || isPlaceholderDoc(digits)) return '';
  return digits;
}

/**
 * NIT sin dígito de verificación.
 *
 * "901891216" y "901891216-4" son la misma empresa; el segundo trae el DV pegado.
 * Los NIT colombianos tienen 9 dígitos, así que con 10 dígitos que empiecen por 8 o 9
 * se asume que el último es el DV. Sin esta normalización, ANDES POWER, PUNTO EMPLEO
 * y WIN PUBLICIDAD no se detectarían como duplicados.
 */
export function docCore(nit?: string | null, cedula?: string | null): string {
  const doc = normDoc(nit, cedula);
  if (!doc) return '';
  if (doc.length === 10 && /^[89]/.test(doc)) return doc.slice(0, 9);
  return doc;
}

/**
 * Distancia de Levenshtein acotada: devuelve `limit + 1` en cuanto se supera el
 * umbral, para no pagar la matriz completa en pares que claramente no se parecen.
 *
 * Atrapa erratas de digitación como "DEIVI QUEVEDO" / "DEIVI QURVEDO".
 */
export function levenshtein(a: string, b: string, limit = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    // Toda la fila ya excede el umbral: ninguna continuación puede bajar de ahí.
    if (rowMin > limit) return limit + 1;
    prev = curr;
  }
  return prev[b.length];
}
