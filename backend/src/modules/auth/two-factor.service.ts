import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomInt } from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { NotificationType } from '../../generated/prisma';
import { TwoFactorConfig } from '../../config/two-factor.config';
import { JwtPayload } from '../../common/interfaces';
import {
  decryptSecret,
  encryptSecret,
  hmacToken,
  parseSecretKey,
} from '../../common/utils/secret-cipher.util';
import { AuthenticatedUser } from '../../common/interfaces';
import { NotificationsService } from '../notifications/notifications.service';
import { RolePrivilegeService } from '../roles/role-privilege.service';
import { TwoFactorRepository } from './two-factor.repository';

/** Cómo pasó el usuario el segundo paso; se guarda en `session_logs.two_factor_method`. */
export type TwoFactorMethod = 'TOTP' | 'BACKUP_CODE' | 'TRUSTED_DEVICE';

/**
 * Qué le falta al login después de la contraseña:
 * - `NONE`: nada, el doble factor no aplica a este usuario.
 * - `TRUSTED_DEVICE`: nada, el navegador es de confianza.
 * - `CHALLENGE`: pedir el código.
 * - `SETUP`: su rol lo exige y aún no registra la app.
 */
export type LoginStep = 'NONE' | 'TRUSTED_DEVICE' | 'CHALLENGE' | 'SETUP';

export type PendingTokenType = '2fa_challenge' | '2fa_setup';

const BACKUP_CODE_COUNT = 10;
// Sin 0/O ni 1/I/L, que se confunden al copiarlos a mano.
const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const BACKUP_CODE_LENGTH = 8;
const TOTP_STEP_SECONDS = 30;

// Acepta el paso anterior y el siguiente: ±30 s de diferencia de reloj.
const totp = authenticator.clone({ window: 1 });

@Injectable()
export class TwoFactorService implements OnModuleInit {
  private readonly logger = new Logger(TwoFactorService.name);
  private key: Buffer | null = null;

  constructor(
    private readonly repository: TwoFactorRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rolePrivilegeService: RolePrivilegeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Sin llave válida el backend no arranca, salvo con el doble factor apagado. */
  onModuleInit() {
    if (this.enforcement !== 'off') {
      this.getKey();
    }
  }

  get config(): TwoFactorConfig {
    return this.configService.get<TwoFactorConfig>('twoFactor')!;
  }

  get enforcement() {
    return this.config.enforcement;
  }

  /** ¿El rol obliga a usar el doble factor con la configuración actual? */
  isRequiredByRole(requireTwoFactor: boolean | undefined) {
    return this.enforcement === 'required' && !!requireTwoFactor;
  }

  assertFeatureEnabled() {
    if (this.enforcement === 'off') {
      throw new ForbiddenException('El doble factor no está habilitado');
    }
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async resolveLoginStep(userId: string, deviceToken?: string): Promise<LoginStep> {
    if (this.enforcement === 'off') return 'NONE';

    const state = await this.requireState(userId);

    if (!state.twoFactorEnabled) {
      return this.isRequiredByRole(state.role.requireTwoFactor) ? 'SETUP' : 'NONE';
    }

    if (deviceToken && (await this.isTrustedDevice(userId, deviceToken))) {
      return 'TRUSTED_DEVICE';
    }
    return 'CHALLENGE';
  }

  /**
   * Un usuario que su rol obliga y aún no registró la app no puede renovar la
   * sesión: así una sesión abierta antes del encendido no sigue viva para siempre
   * (el refresh token rota en cada uso).
   */
  async mustEnrollBeforeRefresh(userId: string): Promise<boolean> {
    if (this.enforcement !== 'required') return false;
    const state = await this.repository.findUserState(userId);
    return !!state && !state.twoFactorEnabled && !!state.role.requireTwoFactor;
  }

  async issuePendingToken(
    user: { id: string; username: string; roleId: string },
    type: PendingTokenType,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      type,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.challengeTtl as any,
    });
  }

  async verifyPendingToken(token: string, type: PendingTokenType): Promise<JwtPayload> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('La verificación venció. Inicia sesión de nuevo.');
    }
    if (payload.type !== type) {
      throw new UnauthorizedException('Token de verificación inválido');
    }
    return payload;
  }

  /** Verifica el código del segundo paso: TOTP de 6 dígitos o un código de respaldo. */
  async verifyLoginCode(userId: string, code: string): Promise<TwoFactorMethod> {
    const state = await this.requireState(userId);
    if (!state.twoFactorEnabled || !state.twoFactorSecret) {
      throw new BadRequestException('El usuario no tiene el doble factor activo');
    }
    this.assertNotLocked(state.twoFactorLockedUntil);

    const normalized = code.replace(/\s+/g, '');
    if (/^\d{6}$/.test(normalized)) {
      const step = this.matchTotpStep(normalized, state.twoFactorSecret, state.twoFactorLastUsedStep);
      if (step === null) return this.failAttempt(userId);
      await this.repository.recordSuccess(userId, step);
      return 'TOTP';
    }

    const backupCode = normalizeBackupCode(normalized);
    const consumed =
      backupCode.length === BACKUP_CODE_LENGTH &&
      (await this.repository.consumeBackupCode(userId, hmacToken(backupCode, this.getKey())));
    if (!consumed) return this.failAttempt(userId);

    await this.repository.recordSuccess(userId, null);
    const remaining = await this.repository.countUnusedBackupCodes(userId);
    this.logger.log(`Usuario ${userId} entró con un código de respaldo; le quedan ${remaining}`);
    return 'BACKUP_CODE';
  }

  // ─── Registro ─────────────────────────────────────────────────────────────

  /** Genera un secreto nuevo y lo deja pendiente hasta confirmar el primer código. */
  async startEnrollment(userId: string) {
    const state = await this.requireState(userId);
    if (state.twoFactorEnabled) {
      throw new BadRequestException('Ya tienes el doble factor activo');
    }

    const secret = totp.generateSecret();
    await this.repository.savePendingSecret(userId, encryptSecret(secret, this.getKey()));

    const otpauthUrl = totp.keyuri(state.username ?? userId, this.config.issuer, secret);
    return {
      otpauthUrl,
      qrCodeDataUrl: await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 }),
      manualKey: secret.match(/.{1,4}/g)!.join(' '),
    };
  }

  /** Confirma el primer código, activa el doble factor y devuelve los códigos de respaldo. */
  async confirmEnrollment(userId: string, code: string): Promise<string[]> {
    const state = await this.requireState(userId);
    if (state.twoFactorEnabled) {
      throw new BadRequestException('Ya tienes el doble factor activo');
    }
    if (!state.twoFactorSecret) {
      throw new BadRequestException('Primero genera el código QR');
    }
    this.assertNotLocked(state.twoFactorLockedUntil);

    const step = this.matchTotpStep(code.replace(/\s+/g, ''), state.twoFactorSecret, null);
    if (step === null) return this.failAttempt(userId);

    const codes = generateBackupCodes();
    await this.repository.enable(userId, step, this.hashBackupCodes(codes));
    return codes;
  }

  // ─── Autogestión ──────────────────────────────────────────────────────────

  async getStatus(userId: string) {
    const state = await this.requireState(userId);
    return {
      enforcement: this.enforcement,
      enabled: state.twoFactorEnabled,
      enabledAt: state.twoFactorEnabledAt,
      requiredByRole: this.isRequiredByRole(state.role.requireTwoFactor),
      backupCodesRemaining: state.twoFactorEnabled
        ? await this.repository.countUnusedBackupCodes(userId)
        : 0,
    };
  }

  /** La contraseña la verifica quien llama; aquí se exige el código. */
  async disable(userId: string, code: string) {
    const state = await this.requireState(userId);
    if (this.isRequiredByRole(state.role.requireTwoFactor)) {
      throw new ForbiddenException('Tu rol exige el doble factor; no puedes desactivarlo');
    }
    await this.verifyLoginCode(userId, code);
    await this.repository.clear(userId, false);
  }

  async regenerateBackupCodes(userId: string, code: string): Promise<string[]> {
    await this.verifyLoginCode(userId, code);
    const codes = generateBackupCodes();
    await this.repository.replaceBackupCodes(userId, this.hashBackupCodes(codes));
    return codes;
  }

  // ─── Equipos de confianza ─────────────────────────────────────────────────

  /** Devuelve el token en claro una sola vez; en la base queda su HMAC. */
  async createTrustedDevice(userId: string, userAgent?: string, ipAddress?: string) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.trustedDeviceDays * 24 * 60 * 60 * 1000);
    await this.repository.createTrustedDevice({
      userId,
      tokenHash: hmacToken(token, this.getKey()),
      userAgent: userAgent?.slice(0, 500),
      ipAddress,
      expiresAt,
    });
    return { deviceToken: token, expiresAt };
  }

  listTrustedDevices(userId: string) {
    return this.repository.listActiveTrustedDevices(userId);
  }

  async revokeTrustedDevice(userId: string, deviceId: string) {
    const revoked = await this.repository.revokeTrustedDevice(userId, deviceId);
    if (!revoked) {
      throw new NotFoundException('Equipo de confianza no encontrado');
    }
  }

  /** Cambiar la contraseña revoca los equipos de confianza. */
  revokeAllTrustedDevices(userId: string) {
    return this.repository.revokeAllTrustedDevices(userId);
  }

  // ─── Reseteo por admin ────────────────────────────────────────────────────

  /**
   * Borra el doble factor de otro usuario y cierra sus sesiones; al entrar
   * vuelve a registrar la app. Sigue la regla de privilegios de roles: el de un
   * admin solo lo restablece otro admin. Nadie se lo restablece a sí mismo:
   * para eso están los códigos de respaldo.
   */
  async resetForUser(actor: AuthenticatedUser, targetUserId: string) {
    if (actor.id === targetUserId) {
      throw new ForbiddenException(
        'No puedes restablecer tu propio doble factor; pídeselo a otro administrador',
      );
    }

    const target = await this.repository.findUserState(targetUserId);
    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.rolePrivilegeService.assertCanManageUser(actor.roleId, targetUserId);

    await this.repository.clear(targetUserId, true);
    this.logger.warn(`${actor.username} restableció el doble factor de ${target.username}`);

    await this.notificationsService.create({
      userId: targetUserId,
      type: NotificationType.TWO_FACTOR_RESET,
      title: 'Doble factor restablecido',
      message: `${actor.username} restableció tu doble factor. La próxima vez que entres tendrás que registrar la app de nuevo.`,
    });

    return { message: 'Doble factor restablecido' };
  }

  // ─── Internos ─────────────────────────────────────────────────────────────

  private getKey(): Buffer {
    if (!this.key) {
      this.key = parseSecretKey(this.config.encryptionKey);
    }
    return this.key;
  }

  private async requireState(userId: string) {
    const state = await this.repository.findUserState(userId);
    if (!state || !state.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }
    return state;
  }

  private async isTrustedDevice(userId: string, deviceToken: string) {
    const device = await this.repository.findActiveTrustedDevice(
      hmacToken(deviceToken, this.getKey()),
    );
    if (!device || device.userId !== userId) return false;
    await this.repository.touchTrustedDevice(device.id);
    return true;
  }

  /**
   * Devuelve el paso de 30 s del código si es válido y posterior al último usado,
   * o `null`. Rechazar un paso ya usado impide reutilizar un código visto.
   */
  private matchTotpStep(
    code: string,
    encryptedSecret: string,
    lastUsedStep: number | null,
  ): number | null {
    if (!/^\d{6}$/.test(code)) return null;
    const secret = decryptSecret(encryptedSecret, this.getKey());
    const delta = totp.checkDelta(code, secret);
    if (delta === null) return null;
    const step = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS) + delta;
    if (lastUsedStep !== null && step <= lastUsedStep) return null;
    return step;
  }

  private assertNotLocked(lockedUntil: Date | null) {
    if (lockedUntil && lockedUntil > new Date()) {
      const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000);
      throw new HttpException(
        `Demasiados intentos fallidos. Intenta de nuevo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async failAttempt(userId: string): Promise<never> {
    const { maxAttempts, lockMinutes } = this.config;
    const attempts = await this.repository.incrementFailedAttempts(userId);
    if (attempts >= maxAttempts) {
      await this.repository.lock(userId, new Date(Date.now() + lockMinutes * 60_000));
      this.logger.warn(`Doble factor bloqueado ${lockMinutes} min para el usuario ${userId}`);
      throw new HttpException(
        `Demasiados intentos fallidos. Intenta de nuevo en ${lockMinutes} minutos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const remaining = maxAttempts - attempts;
    // 400 y no 401: el frontend toma cualquier 401 como sesión vencida, refresca
    // y repite la petición, y eso gastaría un segundo intento con el mismo código.
    throw new BadRequestException(
      `Código incorrecto. Te ${remaining === 1 ? 'queda 1 intento' : `quedan ${remaining} intentos`}.`,
    );
  }

  private hashBackupCodes(codes: string[]) {
    const key = this.getKey();
    return codes.map((code) => hmacToken(normalizeBackupCode(code), key));
  }
}

/** Mayúsculas, sin guion ni espacios: `abcd-efgh` y `ABCDEFGH` son el mismo código. */
export function normalizeBackupCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** 10 códigos de 8 caracteres, presentados como `ABCD-EFGH`. */
export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const chars = Array.from(
      { length: BACKUP_CODE_LENGTH },
      () => BACKUP_CODE_ALPHABET[randomInt(BACKUP_CODE_ALPHABET.length)],
    ).join('');
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  });
}
