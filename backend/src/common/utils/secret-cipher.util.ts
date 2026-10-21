import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'crypto';

/**
 * Cifrado simétrico para secretos que el servidor necesita leer de vuelta
 * (el secreto TOTP del doble factor), y HMAC para los que solo se comparan
 * (códigos de respaldo, tokens de equipo de confianza).
 *
 * Formato del texto cifrado: `v1:<iv>:<tag>:<datos>`, todo en base64. El
 * prefijo de versión deja cambiar de algoritmo sin romper lo ya guardado.
 */

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

/** Decodifica la llave (base64) y exige 32 bytes. */
export function parseSecretKey(keyBase64: string | undefined): Buffer {
  if (!keyBase64) {
    throw new Error('La llave de cifrado no está definida');
  }
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `La llave de cifrado debe tener ${KEY_BYTES} bytes en base64 (tiene ${key.length})`,
    );
  }
  return key;
}

export function encryptSecret(plainText: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join(':');
}

/** Lanza si el texto fue alterado o se cifró con otra llave. */
export function decryptSecret(payload: string, key: Buffer): string {
  const [version, iv, tag, data] = payload.split(':');
  if (version !== VERSION || !iv || !tag || !data) {
    throw new Error('Formato de secreto cifrado no reconocido');
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** HMAC-SHA256 en hex: determinístico, para buscar por igualdad en la base. */
export function hmacToken(value: string, key: Buffer): string {
  return createHmac('sha256', key).update(value).digest('hex');
}
