import { beforeEach, describe, expect, it } from 'vitest';
import { forgetTrustedDevice, getTrustedDeviceToken, saveTrustedDeviceToken } from './trustedDevice';

const FUTURE = '2099-01-01T00:00:00.000Z';

describe('trustedDevice', () => {
  beforeEach(() => localStorage.clear());

  it('guarda un token por usuario, sin distinguir mayúsculas', () => {
    saveTrustedDeviceToken('Caja1', 'token-caja', FUTURE);
    saveTrustedDeviceToken('ventas', 'token-ventas', FUTURE);

    expect(getTrustedDeviceToken('caja1')).toBe('token-caja');
    expect(getTrustedDeviceToken(' VENTAS ')).toBe('token-ventas');
    expect(getTrustedDeviceToken('otro')).toBeUndefined();
  });

  it('descarta un token vencido', () => {
    saveTrustedDeviceToken('caja1', 'viejo', '2000-01-01T00:00:00.000Z');

    expect(getTrustedDeviceToken('caja1')).toBeUndefined();
    expect(localStorage.getItem('two-factor-trusted-devices')).not.toContain('viejo');
  });

  it('olvida el token de un usuario sin tocar los demás', () => {
    saveTrustedDeviceToken('caja1', 'a', FUTURE);
    saveTrustedDeviceToken('ventas', 'b', FUTURE);

    forgetTrustedDevice('caja1');

    expect(getTrustedDeviceToken('caja1')).toBeUndefined();
    expect(getTrustedDeviceToken('ventas')).toBe('b');
  });

  it('tolera un valor corrupto en localStorage', () => {
    localStorage.setItem('two-factor-trusted-devices', '{no es json');
    expect(getTrustedDeviceToken('caja1')).toBeUndefined();
  });
});
