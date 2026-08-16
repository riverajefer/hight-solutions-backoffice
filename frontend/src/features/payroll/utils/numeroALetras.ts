// Conversión de un valor en pesos a su expresión en letras, para la línea
// "Son: ... PESOS M/CTE" del desprendible de nómina.
// La nómina se maneja en pesos enteros (ver Math.round en calcTotal), así que
// el valor se redondea antes de convertir.

const UNIDADES = [
  '',
  'UNO',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISÉIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
  'VEINTE',
  'VEINTIUNO',
  'VEINTIDÓS',
  'VEINTITRÉS',
  'VEINTICUATRO',
  'VEINTICINCO',
  'VEINTISÉIS',
  'VEINTISIETE',
  'VEINTIOCHO',
  'VEINTINUEVE',
];

const DECENAS = [
  '',
  '',
  'VEINTE',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

/** Convierte un entero de 0 a 999 en letras. */
function tresDigitos(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const centena = Math.floor(n / 100);
  const resto = n % 100;

  const partes: string[] = [];
  if (centena > 0) partes.push(CENTENAS[centena]);

  if (resto > 0) {
    if (resto < 30) {
      partes.push(UNIDADES[resto]);
    } else {
      const decena = Math.floor(resto / 10);
      const unidad = resto % 10;
      partes.push(
        unidad > 0 ? `${DECENAS[decena]} Y ${UNIDADES[unidad]}` : DECENAS[decena],
      );
    }
  }

  return partes.join(' ');
}

/**
 * Apócope del español: "UNO" pasa a "UN" cuando precede a un sustantivo
 * ("VEINTIÚN MIL PESOS", no "VEINTIUNO MIL PESOS").
 */
function apocopar(texto: string): string {
  if (texto === 'UNO' || texto.endsWith(' UNO')) {
    return texto.slice(0, -3) + 'UN';
  }
  if (texto === 'VEINTIUNO' || texto.endsWith(' VEINTIUNO')) {
    return texto.slice(0, -9) + 'VEINTIÚN';
  }
  return texto;
}

/**
 * Convierte un valor numérico a letras en mayúsculas, sin el sufijo de moneda.
 * Soporta hasta miles de millones, suficiente para cualquier nómina.
 */
export function numeroALetras(value: number): string {
  const n = Math.round(Math.abs(value));

  if (n === 0) return 'CERO';

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const partes: string[] = [];

  if (millones > 0) {
    partes.push(
      millones === 1
        ? 'UN MILLÓN'
        : `${apocopar(tresDigitos(millones))} MILLONES`,
    );
  }

  if (miles > 0) {
    // "UN MIL" no se usa en español: se dice "MIL".
    partes.push(miles === 1 ? 'MIL' : `${apocopar(tresDigitos(miles))} MIL`);
  }

  if (resto > 0) {
    partes.push(tresDigitos(resto));
  }

  const texto = partes.join(' ');
  return value < 0 ? `MENOS ${texto}` : texto;
}

/** Expresión completa usada en el desprendible: "OCHOCIENTOS ... PESOS M/CTE". */
export function pesosEnLetras(value: number): string {
  return `${apocopar(numeroALetras(value))} PESOS M/CTE`;
}
