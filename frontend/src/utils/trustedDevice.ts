import { getFromStorage, saveToStorage } from './storage';

/**
 * Tokens de "equipo de confianza" del doble factor, uno por usuario.
 *
 * Viven en una llave propia que el logout no borra: el punto es que este
 * navegador no vuelva a pedir el código. Van por usuario porque en un
 * computador compartido cada quien tiene su propio token; el backend rechaza
 * el de otro usuario.
 */
const TRUSTED_DEVICES_KEY = 'two-factor-trusted-devices';

type TrustedDeviceMap = Record<string, { token: string; expiresAt: string }>;

const normalize = (username: string) => username.trim().toLowerCase();

function readAll(): TrustedDeviceMap {
  return getFromStorage<TrustedDeviceMap>(TRUSTED_DEVICES_KEY, {}) ?? {};
}

/** Token vigente de este usuario en este navegador, si hay. */
export function getTrustedDeviceToken(username: string): string | undefined {
  const entry = readAll()[normalize(username)];
  if (!entry) return undefined;
  if (new Date(entry.expiresAt).getTime() <= Date.now()) {
    forgetTrustedDevice(username);
    return undefined;
  }
  return entry.token;
}

export function saveTrustedDeviceToken(username: string, token: string, expiresAt: string) {
  saveToStorage(TRUSTED_DEVICES_KEY, { ...readAll(), [normalize(username)]: { token, expiresAt } });
}

export function forgetTrustedDevice(username: string) {
  const all = readAll();
  delete all[normalize(username)];
  saveToStorage(TRUSTED_DEVICES_KEY, all);
}
