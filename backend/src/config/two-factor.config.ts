import { ConfigType, registerAs } from '@nestjs/config';

/**
 * `off`: no se pide el doble factor y sus endpoints responden 403 (sirve de
 * interruptor de emergencia). `optional`: lo pide a quien lo activó.
 * `required`: además lo exige a los roles con `requireTwoFactor`.
 */
export type TwoFactorEnforcement = 'off' | 'optional' | 'required';

const ENFORCEMENT_VALUES: TwoFactorEnforcement[] = ['off', 'optional', 'required'];

function parseEnforcement(value: string | undefined): TwoFactorEnforcement {
  const normalized = (value || 'off').trim().toLowerCase() as TwoFactorEnforcement;
  return ENFORCEMENT_VALUES.includes(normalized) ? normalized : 'off';
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const twoFactorConfig = registerAs('twoFactor', () => ({
  enforcement: parseEnforcement(process.env.TWO_FACTOR_ENFORCEMENT),
  encryptionKey: process.env.TWO_FACTOR_ENCRYPTION_KEY,
  issuer: process.env.TWO_FACTOR_ISSUER || 'High Solutions CRM',
  challengeTtl: process.env.TWO_FACTOR_CHALLENGE_TTL || '5m',
  trustedDeviceDays: parsePositiveInt(process.env.TWO_FACTOR_TRUSTED_DEVICE_DAYS, 30),
  maxAttempts: parsePositiveInt(process.env.TWO_FACTOR_MAX_ATTEMPTS, 5),
  lockMinutes: parsePositiveInt(process.env.TWO_FACTOR_LOCK_MINUTES, 15),
}));

export default twoFactorConfig;
export type TwoFactorConfig = ConfigType<typeof twoFactorConfig>;
