/**
 * Convierte un label en una clave camelCase válida para el schema de campos.
 * Ej: "Tipo de papel" → "tipoDePapel"
 * Garantiza unicidad contra un listado de claves existentes.
 */
export function generateKey(label: string, existingKeys: string[]): string {
  if (!label.trim()) return ensureUnique('campo', existingKeys);

  const normalized = label
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accent marks
    .replace(/[^a-zA-Z0-9\s]/g, '')  // remove non-alphanumeric
    .trim();

  if (!normalized) return ensureUnique('campo', existingKeys);

  const words = normalized.split(/\s+/).filter(Boolean);
  const camel =
    words[0].toLowerCase() +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');

  return ensureUnique(camel || 'campo', existingKeys);
}

function ensureUnique(base: string, existingKeys: string[]): string {
  if (!existingKeys.includes(base)) return base;
  let counter = 1;
  while (existingKeys.includes(`${base}${counter}`)) {
    counter++;
  }
  return `${base}${counter}`;
}
