import { describe, expect, it } from 'vitest';
import { anyTwoFactorCodeSchema, backupCodeSchema, totpCodeSchema } from './twoFactorCode';

describe('esquemas del código del doble factor', () => {
  it('el código de la app tiene 6 dígitos y tolera espacios', () => {
    expect(totpCodeSchema.parse('123 456')).toBe('123456');
    expect(totpCodeSchema.safeParse('12345').success).toBe(false);
    expect(totpCodeSchema.safeParse('12345a').success).toBe(false);
  });

  it('el código de respaldo acepta minúsculas y sin guion', () => {
    expect(backupCodeSchema.parse(' abcd-efgh ')).toBe('ABCD-EFGH');
    expect(backupCodeSchema.parse('abcdefgh')).toBe('ABCDEFGH');
    expect(backupCodeSchema.safeParse('ABC-DEFG').success).toBe(false);
  });

  it('en los diálogos del perfil sirve cualquiera de los dos', () => {
    expect(anyTwoFactorCodeSchema.safeParse('123456').success).toBe(true);
    expect(anyTwoFactorCodeSchema.safeParse('ABCD-EFGH').success).toBe(true);
    expect(anyTwoFactorCodeSchema.safeParse('hola').success).toBe(false);
  });
});
