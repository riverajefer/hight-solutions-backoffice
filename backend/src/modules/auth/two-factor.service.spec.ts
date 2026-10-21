import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';
import {
  decryptSecret,
  encryptSecret,
  hmacToken,
} from '../../common/utils/secret-cipher.util';
import { NotificationsService } from '../notifications/notifications.service';
import { RolePrivilegeService } from '../roles/role-privilege.service';
import { TwoFactorRepository } from './two-factor.repository';
import { TwoFactorService, generateBackupCodes, normalizeBackupCode } from './two-factor.service';

const KEY_B64 = randomBytes(32).toString('base64');
const KEY = Buffer.from(KEY_B64, 'base64');
const SECRET = authenticator.generateSecret();
const currentStep = () => Math.floor(Date.now() / 1000 / 30);

const mockRepository = {
  findUserState: jest.fn(),
  savePendingSecret: jest.fn(),
  enable: jest.fn(),
  clear: jest.fn(),
  recordSuccess: jest.fn(),
  incrementFailedAttempts: jest.fn(),
  lock: jest.fn(),
  replaceBackupCodes: jest.fn(),
  consumeBackupCode: jest.fn(),
  countUnusedBackupCodes: jest.fn(),
  createTrustedDevice: jest.fn(),
  findActiveTrustedDevice: jest.fn(),
  touchTrustedDevice: jest.fn(),
  listActiveTrustedDevices: jest.fn(),
  revokeTrustedDevice: jest.fn(),
  revokeAllTrustedDevices: jest.fn(),
};

const mockRolePrivilegeService = { assertCanManageUser: jest.fn() };
const mockNotificationsService = { create: jest.fn() };

function buildConfig(overrides: Record<string, unknown> = {}) {
  return {
    enforcement: 'required',
    encryptionKey: KEY_B64,
    issuer: 'High Solutions CRM (Pruebas)',
    challengeTtl: '5m',
    trustedDeviceDays: 30,
    maxAttempts: 5,
    lockMinutes: 15,
    ...overrides,
  };
}

function state(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: 'operario1',
    isActive: true,
    twoFactorEnabled: true,
    twoFactorSecret: encryptSecret(SECRET, KEY),
    twoFactorEnabledAt: new Date('2026-10-01'),
    twoFactorLastUsedStep: null,
    twoFactorFailedAttempts: 0,
    twoFactorLockedUntil: null,
    role: { id: 'role-1', name: 'caja', requireTwoFactor: true },
    ...overrides,
  };
}

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let twoFactorConfig: Record<string, unknown>;

  beforeEach(async () => {
    twoFactorConfig = buildConfig();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: TwoFactorRepository, useValue: mockRepository },
        { provide: JwtService, useValue: new JwtService({}) },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'twoFactor' ? twoFactorConfig : key === 'JWT_ACCESS_SECRET' ? 'test-secret' : undefined,
            ),
          },
        },
        { provide: RolePrivilegeService, useValue: mockRolePrivilegeService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get(TwoFactorService);
    mockRepository.incrementFailedAttempts.mockResolvedValue(1);
    mockRepository.countUnusedBackupCodes.mockResolvedValue(9);
  });

  afterEach(() => jest.clearAllMocks());

  describe('onModuleInit', () => {
    it('no deja arrancar con el doble factor encendido y sin llave válida', () => {
      twoFactorConfig = buildConfig({ encryptionKey: 'corta' });
      expect(() => service.onModuleInit()).toThrow('32 bytes');
    });

    it('con el doble factor apagado arranca aunque falte la llave', () => {
      twoFactorConfig = buildConfig({ enforcement: 'off', encryptionKey: undefined });
      expect(() => service.onModuleInit()).not.toThrow();
    });
  });

  describe('resolveLoginStep', () => {
    it('con TWO_FACTOR_ENFORCEMENT=off no pide nada ni consulta la base', async () => {
      twoFactorConfig = buildConfig({ enforcement: 'off' });
      await expect(service.resolveLoginStep('user-1')).resolves.toBe('NONE');
      expect(mockRepository.findUserState).not.toHaveBeenCalled();
    });

    it('pide registrar la app cuando el rol lo exige y no lo ha activado', async () => {
      mockRepository.findUserState.mockResolvedValue(state({ twoFactorEnabled: false }));
      await expect(service.resolveLoginStep('user-1')).resolves.toBe('SETUP');
    });

    it('con optional no obliga al rol: deja entrar a quien no lo activó', async () => {
      twoFactorConfig = buildConfig({ enforcement: 'optional' });
      mockRepository.findUserState.mockResolvedValue(state({ twoFactorEnabled: false }));
      await expect(service.resolveLoginStep('user-1')).resolves.toBe('NONE');
    });

    it('deja entrar sin código a quien no lo tiene y su rol no lo exige', async () => {
      mockRepository.findUserState.mockResolvedValue(
        state({ twoFactorEnabled: false, role: { id: 'r', name: 'admin', requireTwoFactor: false } }),
      );
      await expect(service.resolveLoginStep('user-1')).resolves.toBe('NONE');
    });

    it('pide el código a quien lo tiene activo', async () => {
      mockRepository.findUserState.mockResolvedValue(state());
      await expect(service.resolveLoginStep('user-1')).resolves.toBe('CHALLENGE');
    });

    it('salta el código con un equipo de confianza del mismo usuario', async () => {
      mockRepository.findUserState.mockResolvedValue(state());
      mockRepository.findActiveTrustedDevice.mockResolvedValue({ id: 'dev-1', userId: 'user-1' });

      await expect(service.resolveLoginStep('user-1', 'device-token')).resolves.toBe('TRUSTED_DEVICE');
      expect(mockRepository.findActiveTrustedDevice).toHaveBeenCalledWith(hmacToken('device-token', KEY));
      expect(mockRepository.touchTrustedDevice).toHaveBeenCalledWith('dev-1');
    });

    it('no acepta el equipo de confianza de otro usuario', async () => {
      mockRepository.findUserState.mockResolvedValue(state());
      mockRepository.findActiveTrustedDevice.mockResolvedValue({ id: 'dev-1', userId: 'otro' });

      await expect(service.resolveLoginStep('user-1', 'device-token')).resolves.toBe('CHALLENGE');
      expect(mockRepository.touchTrustedDevice).not.toHaveBeenCalled();
    });
  });

  describe('tokens temporales', () => {
    const user = { id: 'user-1', username: 'operario1', roleId: 'role-1' };

    it('verifica un token temporal del tipo esperado', async () => {
      const token = await service.issuePendingToken(user, '2fa_challenge');
      await expect(service.verifyPendingToken(token, '2fa_challenge')).resolves.toMatchObject({
        sub: 'user-1',
        type: '2fa_challenge',
      });
    });

    it('rechaza un token de registro usado como token de verificación', async () => {
      const token = await service.issuePendingToken(user, '2fa_setup');
      await expect(service.verifyPendingToken(token, '2fa_challenge')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza un token alterado', async () => {
      await expect(service.verifyPendingToken('no-es-un-jwt', '2fa_challenge')).rejects.toThrow(
        'La verificación venció',
      );
    });
  });

  describe('verifyLoginCode', () => {
    it('acepta el código actual de la app y guarda su paso', async () => {
      mockRepository.findUserState.mockResolvedValue(state());

      await expect(service.verifyLoginCode('user-1', authenticator.generate(SECRET))).resolves.toBe('TOTP');
      const [, step] = mockRepository.recordSuccess.mock.calls[0];
      expect(Math.abs(step - currentStep())).toBeLessThanOrEqual(1);
    });

    it('rechaza reutilizar un código de un paso ya usado', async () => {
      mockRepository.findUserState.mockResolvedValue(state({ twoFactorLastUsedStep: currentStep() + 1 }));

      await expect(
        service.verifyLoginCode('user-1', authenticator.generate(SECRET)),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepository.recordSuccess).not.toHaveBeenCalled();
      expect(mockRepository.incrementFailedAttempts).toHaveBeenCalledWith('user-1');
    });

    it('dice cuántos intentos quedan cuando el código es incorrecto', async () => {
      mockRepository.findUserState.mockResolvedValue(state());
      mockRepository.incrementFailedAttempts.mockResolvedValue(3);

      await expect(service.verifyLoginCode('user-1', '000000')).rejects.toThrow('Te quedan 2 intentos');
    });

    it('bloquea al llegar al máximo de intentos', async () => {
      mockRepository.findUserState.mockResolvedValue(state());
      mockRepository.incrementFailedAttempts.mockResolvedValue(5);

      const error = await service.verifyLoginCode('user-1', '000000').catch((e) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(mockRepository.lock).toHaveBeenCalledWith('user-1', expect.any(Date));
    });

    it('rechaza cualquier código mientras está bloqueado, sin gastar intentos', async () => {
      mockRepository.findUserState.mockResolvedValue(
        state({ twoFactorLockedUntil: new Date(Date.now() + 10 * 60_000) }),
      );

      const error = await service.verifyLoginCode('user-1', authenticator.generate(SECRET)).catch((e) => e);
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.message).toContain('10 minutos');
      expect(mockRepository.incrementFailedAttempts).not.toHaveBeenCalled();
    });

    it('acepta un código de respaldo escrito en minúsculas y sin guion', async () => {
      mockRepository.findUserState.mockResolvedValue(state());
      mockRepository.consumeBackupCode.mockResolvedValue(true);

      await expect(service.verifyLoginCode('user-1', 'abcd efgh')).resolves.toBe('BACKUP_CODE');
      expect(mockRepository.consumeBackupCode).toHaveBeenCalledWith('user-1', hmacToken('ABCDEFGH', KEY));
      expect(mockRepository.recordSuccess).toHaveBeenCalledWith('user-1', null);
    });

    it('rechaza un código de respaldo ya usado', async () => {
      mockRepository.findUserState.mockResolvedValue(state());
      mockRepository.consumeBackupCode.mockResolvedValue(false);

      await expect(service.verifyLoginCode('user-1', 'ABCD-EFGH')).rejects.toThrow(BadRequestException);
    });

    it('falla si el usuario no tiene el doble factor activo', async () => {
      mockRepository.findUserState.mockResolvedValue(state({ twoFactorEnabled: false }));
      await expect(service.verifyLoginCode('user-1', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('registro', () => {
    it('guarda el secreto cifrado y devuelve el QR con el nombre del ambiente', async () => {
      mockRepository.findUserState.mockResolvedValue(state({ twoFactorEnabled: false, twoFactorSecret: null }));

      const result = await service.startEnrollment('user-1');

      const [, encrypted] = mockRepository.savePendingSecret.mock.calls[0];
      const secret = decryptSecret(encrypted, KEY);
      expect(result.manualKey.replace(/ /g, '')).toBe(secret);
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(decodeURIComponent(result.otpauthUrl)).toContain('High Solutions CRM (Pruebas)');
      expect(result.otpauthUrl).toContain('operario1');
    });

    it('no genera otro secreto si ya está activo', async () => {
      mockRepository.findUserState.mockResolvedValue(state());
      await expect(service.startEnrollment('user-1')).rejects.toThrow(BadRequestException);
      expect(mockRepository.savePendingSecret).not.toHaveBeenCalled();
    });

    it('activa con el primer código válido y devuelve 10 códigos de respaldo', async () => {
      mockRepository.findUserState.mockResolvedValue(state({ twoFactorEnabled: false }));

      const codes = await service.confirmEnrollment('user-1', authenticator.generate(SECRET));

      expect(codes).toHaveLength(10);
      const [, step, hashes] = mockRepository.enable.mock.calls[0];
      expect(Math.abs(step - currentStep())).toBeLessThanOrEqual(1);
      expect(hashes).toEqual(codes.map((c) => hmacToken(normalizeBackupCode(c), KEY)));
    });

    it('no activa con un código incorrecto', async () => {
      mockRepository.findUserState.mockResolvedValue(state({ twoFactorEnabled: false }));
      await expect(service.confirmEnrollment('user-1', '000000')).rejects.toThrow(BadRequestException);
      expect(mockRepository.enable).not.toHaveBeenCalled();
    });

    it('pide generar el QR antes de confirmar', async () => {
      mockRepository.findUserState.mockResolvedValue(state({ twoFactorEnabled: false, twoFactorSecret: null }));
      await expect(service.confirmEnrollment('user-1', '123456')).rejects.toThrow('Primero genera el código QR');
    });
  });

  describe('disable', () => {
    it('no deja desactivarlo si el rol lo exige', async () => {
      mockRepository.findUserState.mockResolvedValue(state());
      await expect(service.disable('user-1', '123456')).rejects.toThrow(ForbiddenException);
      expect(mockRepository.clear).not.toHaveBeenCalled();
    });

    it('lo desactiva con un código válido si el rol no lo exige', async () => {
      mockRepository.findUserState.mockResolvedValue(
        state({ role: { id: 'r', name: 'ventas', requireTwoFactor: false } }),
      );
      await service.disable('user-1', authenticator.generate(SECRET));
      expect(mockRepository.clear).toHaveBeenCalledWith('user-1', false);
    });
  });

  describe('mustEnrollBeforeRefresh', () => {
    it('bloquea la renovación de quien su rol obliga y no lo ha registrado', async () => {
      mockRepository.findUserState.mockResolvedValue(state({ twoFactorEnabled: false }));
      await expect(service.mustEnrollBeforeRefresh('user-1')).resolves.toBe(true);
    });

    it('no bloquea con optional', async () => {
      twoFactorConfig = buildConfig({ enforcement: 'optional' });
      await expect(service.mustEnrollBeforeRefresh('user-1')).resolves.toBe(false);
      expect(mockRepository.findUserState).not.toHaveBeenCalled();
    });
  });

  describe('resetForUser', () => {
    const actor = { id: 'admin-1', username: 'gerencia', roleId: 'role-admin' };

    it('no deja restablecerse el propio doble factor', async () => {
      await expect(service.resetForUser({ ...actor, id: 'user-1' }, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRepository.clear).not.toHaveBeenCalled();
    });

    it('respeta la regla de privilegios de roles', async () => {
      mockRepository.findUserState.mockResolvedValue(state());
      mockRolePrivilegeService.assertCanManageUser.mockRejectedValue(new ForbiddenException());

      await expect(service.resetForUser(actor, 'user-1')).rejects.toThrow(ForbiddenException);
      expect(mockRepository.clear).not.toHaveBeenCalled();
    });

    it('borra el doble factor, cierra las sesiones y avisa al usuario', async () => {
      mockRepository.findUserState.mockResolvedValue(state());
      mockRolePrivilegeService.assertCanManageUser.mockResolvedValue(undefined);

      await service.resetForUser(actor, 'user-1');

      expect(mockRolePrivilegeService.assertCanManageUser).toHaveBeenCalledWith('role-admin', 'user-1');
      expect(mockRepository.clear).toHaveBeenCalledWith('user-1', true);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', type: 'TWO_FACTOR_RESET' }),
      );
    });
  });

  describe('createTrustedDevice', () => {
    it('guarda solo el HMAC del token y vence en los días configurados', async () => {
      const before = Date.now();
      const { deviceToken, expiresAt } = await service.createTrustedDevice('user-1', 'UA', '10.0.0.1');

      const [data] = mockRepository.createTrustedDevice.mock.calls[0];
      expect(data.tokenHash).toBe(hmacToken(deviceToken, KEY));
      expect(data.tokenHash).not.toContain(deviceToken);
      const days = (expiresAt.getTime() - before) / 86_400_000;
      expect(Math.round(days)).toBe(30);
    });
  });
});

describe('generateBackupCodes', () => {
  it('genera 10 códigos distintos con formato ABCD-EFGH y sin caracteres ambiguos', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
    }
  });
});
