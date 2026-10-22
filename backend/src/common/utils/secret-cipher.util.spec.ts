import { randomBytes } from 'crypto';
import { decryptSecret, encryptSecret, hmacToken, parseSecretKey } from './secret-cipher.util';

describe('secret-cipher.util', () => {
  const key = randomBytes(32);

  it('descifra lo que cifra', () => {
    const payload = encryptSecret('JBSWY3DPEHPK3PXP', key);
    expect(payload.startsWith('v1:')).toBe(true);
    expect(decryptSecret(payload, key)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('cifra distinto cada vez (IV aleatorio)', () => {
    expect(encryptSecret('mismo', key)).not.toBe(encryptSecret('mismo', key));
  });

  it('rechaza un texto alterado', () => {
    const [v, iv, tag, data] = encryptSecret('secreto', key).split(':');
    const altered = Buffer.from(data, 'base64');
    altered[0] ^= 1;
    expect(() => decryptSecret([v, iv, tag, altered.toString('base64')].join(':'), key)).toThrow();
  });

  it('rechaza descifrar con otra llave', () => {
    const payload = encryptSecret('secreto', key);
    expect(() => decryptSecret(payload, randomBytes(32))).toThrow();
  });

  it('rechaza un formato desconocido', () => {
    expect(() => decryptSecret('texto-plano', key)).toThrow('Formato');
  });

  it('exige una llave de 32 bytes', () => {
    expect(() => parseSecretKey(undefined)).toThrow('no está definida');
    expect(() => parseSecretKey(randomBytes(16).toString('base64'))).toThrow('32 bytes');
    expect(parseSecretKey(key.toString('base64'))).toEqual(key);
  });

  it('el HMAC es determinístico y depende de la llave', () => {
    expect(hmacToken('abc', key)).toBe(hmacToken('abc', key));
    expect(hmacToken('abc', key)).not.toBe(hmacToken('abc', randomBytes(32)));
  });
});
