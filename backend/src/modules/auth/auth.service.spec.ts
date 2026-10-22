import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { SessionLogsService } from '../session-logs/session-logs.service';
import { AttendanceService } from '../attendance/attendance.service';
import { TwoFactorService } from './two-factor.service';
import { createMockPrismaService, MockPrismaService } from '../../database/prisma.service.mock';
import { AuthenticatedUser } from '../../common/interfaces';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Import after mock so we get the mocked version
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_ACCESS_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
    };
    return config[key];
  }),
};

const mockSessionLogsService = {
  createLoginLog: jest.fn().mockResolvedValue(undefined),
  createLogoutLog: jest.fn().mockResolvedValue(undefined),
};

const mockAttendanceService = {
  checkIn: jest.fn().mockResolvedValue(undefined),
  checkOut: jest.fn().mockResolvedValue(undefined),
  closeOpenRecordOnLogout: jest.fn().mockResolvedValue(undefined),
};

const mockTwoFactorService = {
  resolveLoginStep: jest.fn(),
  issuePendingToken: jest.fn(),
  verifyPendingToken: jest.fn(),
  verifyLoginCode: jest.fn(),
  startEnrollment: jest.fn(),
  confirmEnrollment: jest.fn(),
  createTrustedDevice: jest.fn(),
  mustEnrollBeforeRefresh: jest.fn(),
  revokeAllTrustedDevices: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: MockPrismaService;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    roleId: 'role-1',
    firstName: 'John',
    lastName: 'Doe',
    profilePhoto: null,
    cargoId: null,
    role: { id: 'role-1', name: 'admin' },
    cargo: null,
  };

  const mockUserFromDb = {
    ...mockUser,
    isActive: true,
    password: 'hashed-password-in-db',
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SessionLogsService, useValue: mockSessionLogsService },
        { provide: AttendanceService, useValue: mockAttendanceService },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Por defecto el doble factor no aplica: el login se comporta como antes.
    mockTwoFactorService.resolveLoginStep.mockResolvedValue('NONE');
    mockTwoFactorService.mustEnrollBeforeRefresh.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // validateUser
  // ─────────────────────────────────────────────
  describe('validateUser', () => {
    it('should return AuthenticatedUser without password when credentials are valid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserFromDb);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        roleId: mockUser.roleId,
      });
    });

    it('should return null when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('notexist@example.com', 'password');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password does not match', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserFromDb);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrong-password');

      expect(result).toBeNull();
    });

    it('should query prisma with the provided email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.validateUser('test@example.com', 'password');

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { username: 'test@example.com' } }),
      );
    });

    it('should return null when user is inactive', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        isActive: false,
      });

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // login
  // ─────────────────────────────────────────────
  describe('login', () => {
    beforeEach(() => {
      (mockJwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      (prisma.user.update as jest.Mock).mockResolvedValue({});
    });

    it('should return access and refresh tokens', async () => {
      const result = await service.login(mockUser);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should not hash the refresh token with bcrypt (truncates at 72 bytes)', async () => {
      await service.login(mockUser);

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should update the user refreshToken in DB with its SHA-256', async () => {
      await service.login(mockUser);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: sha256('mock-refresh-token') },
      });
    });

    it('should call jwtService.signAsync twice with correct token types', async () => {
      await service.login(mockUser);

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ type: 'access', sub: mockUser.id }),
        expect.any(Object),
      );
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ type: 'refresh', sub: mockUser.id }),
        expect.any(Object),
      );
    });
  });

  // ─────────────────────────────────────────────
  // loginWithPermissions
  // ─────────────────────────────────────────────
  describe('loginWithPermissions', () => {
    beforeEach(() => {
      (mockJwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      // getUserPermissions call
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        isActive: true,
        role: {
          permissions: [{ permission: { name: 'read_users' } }],
        },
      });
    });

    it('should return tokens, user, and permissions', async () => {
      const result = await service.loginWithPermissions(mockUser, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toMatchObject({
        status: 'OK',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: mockUser,
        permissions: ['read_users'],
      });
    });

    it('should call sessionLogsService.createLoginLog with userId, ipAddress, userAgent', async () => {
      await service.loginWithPermissions(mockUser, '127.0.0.1', 'Mozilla/5.0');

      expect(mockSessionLogsService.createLoginLog).toHaveBeenCalledWith(
        mockUser.id,
        '127.0.0.1',
        'Mozilla/5.0',
        null,
      );
    });

    it('should return empty permissions array when user role has no permissions', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        isActive: true,
        role: { permissions: [] },
      });

      const result = await service.loginWithPermissions(mockUser);

      expect(result).toMatchObject({ status: 'OK', permissions: [] });
    });
  });

  // ─────────────────────────────────────────────
  // Login con doble factor
  // ─────────────────────────────────────────────
  describe('loginWithPermissions con doble factor', () => {
    beforeEach(() => {
      (mockJwtService.signAsync as jest.Mock).mockResolvedValue('mock-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        isActive: true,
        role: { permissions: [] },
      });
    });

    it('no entrega la sesión y devuelve un challengeToken cuando hay que pedir el código', async () => {
      mockTwoFactorService.resolveLoginStep.mockResolvedValue('CHALLENGE');
      mockTwoFactorService.issuePendingToken.mockResolvedValue('challenge-token');

      const result = await service.loginWithPermissions(mockUser, '127.0.0.1', 'UA', 'device-token');

      expect(mockTwoFactorService.resolveLoginStep).toHaveBeenCalledWith(mockUser.id, 'device-token');
      expect(mockTwoFactorService.issuePendingToken).toHaveBeenCalledWith(mockUser, '2fa_challenge');
      expect(result).toEqual({ status: '2FA_REQUIRED', challengeToken: 'challenge-token' });
      expect(result).not.toHaveProperty('accessToken');
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(mockSessionLogsService.createLoginLog).not.toHaveBeenCalled();
    });

    it('devuelve un setupToken cuando el rol exige el doble factor y no lo ha registrado', async () => {
      mockTwoFactorService.resolveLoginStep.mockResolvedValue('SETUP');
      mockTwoFactorService.issuePendingToken.mockResolvedValue('setup-token');

      const result = await service.loginWithPermissions(mockUser);

      expect(mockTwoFactorService.issuePendingToken).toHaveBeenCalledWith(mockUser, '2fa_setup');
      expect(result).toEqual({ status: '2FA_SETUP_REQUIRED', setupToken: 'setup-token' });
    });

    it('entrega la sesión y registra TRUSTED_DEVICE cuando el navegador es de confianza', async () => {
      mockTwoFactorService.resolveLoginStep.mockResolvedValue('TRUSTED_DEVICE');

      const result = await service.loginWithPermissions(mockUser, '127.0.0.1', 'UA', 'device-token');

      expect(result).toMatchObject({ status: 'OK', accessToken: 'mock-token' });
      expect(mockSessionLogsService.createLoginLog).toHaveBeenCalledWith(
        mockUser.id,
        '127.0.0.1',
        'UA',
        'TRUSTED_DEVICE',
      );
    });
  });

  describe('completeTwoFactorLogin', () => {
    const origin = { ipAddress: '127.0.0.1', userAgent: 'UA' };

    beforeEach(() => {
      (mockJwtService.signAsync as jest.Mock).mockResolvedValue('mock-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        mustChangePassword: false,
        twoFactorEnabled: true,
        role: { id: 'role-1', name: 'admin', permissions: [] },
      });
      mockTwoFactorService.verifyPendingToken.mockResolvedValue({ sub: mockUser.id, type: '2fa_challenge' });
      mockTwoFactorService.verifyLoginCode.mockResolvedValue('TOTP');
    });

    it('verifica el token temporal y el código antes de entregar la sesión', async () => {
      const result = await service.completeTwoFactorLogin('challenge-token', '123456', false, origin);

      expect(mockTwoFactorService.verifyPendingToken).toHaveBeenCalledWith('challenge-token', '2fa_challenge');
      expect(mockTwoFactorService.verifyLoginCode).toHaveBeenCalledWith(mockUser.id, '123456');
      expect(result).toMatchObject({ status: 'OK', accessToken: 'mock-token' });
      expect(result).not.toHaveProperty('deviceToken');
      expect(mockSessionLogsService.createLoginLog).toHaveBeenCalledWith(
        mockUser.id,
        '127.0.0.1',
        'UA',
        'TOTP',
      );
    });

    it('no entrega la sesión si el código es incorrecto', async () => {
      mockTwoFactorService.verifyLoginCode.mockRejectedValue(new UnauthorizedException('Código incorrecto'));

      await expect(
        service.completeTwoFactorLogin('challenge-token', '000000', false, origin),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('con rememberDevice devuelve el token del equipo de confianza', async () => {
      const expiresAt = new Date('2026-11-20');
      mockTwoFactorService.createTrustedDevice.mockResolvedValue({ deviceToken: 'device-token', expiresAt });

      const result = await service.completeTwoFactorLogin('challenge-token', '123456', true, origin);

      expect(mockTwoFactorService.createTrustedDevice).toHaveBeenCalledWith(mockUser.id, 'UA', '127.0.0.1');
      expect(result).toMatchObject({ deviceToken: 'device-token', deviceTokenExpiresAt: expiresAt });
    });
  });

  describe('confirmLoginEnrollment', () => {
    it('activa el doble factor, entrega la sesión y devuelve los códigos de respaldo', async () => {
      (mockJwtService.signAsync as jest.Mock).mockResolvedValue('mock-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        mustChangePassword: true,
        twoFactorEnabled: true,
        role: { id: 'role-1', name: 'admin', permissions: [] },
      });
      mockTwoFactorService.verifyPendingToken.mockResolvedValue({ sub: mockUser.id, type: '2fa_setup' });
      mockTwoFactorService.confirmEnrollment.mockResolvedValue(['AAAA-BBBB']);

      const result = await service.confirmLoginEnrollment('setup-token', '123456', false, {});

      expect(mockTwoFactorService.verifyPendingToken).toHaveBeenCalledWith('setup-token', '2fa_setup');
      expect(result).toMatchObject({
        status: 'OK',
        backupCodes: ['AAAA-BBBB'],
        user: expect.objectContaining({ mustChangePassword: true }),
      });
    });
  });

  // ─────────────────────────────────────────────
  // refreshTokens
  // ─────────────────────────────────────────────
  describe('refreshTokens', () => {
    const incomingRefreshToken = 'incoming-refresh-token';
    const storedRefreshHash = sha256(incomingRefreshToken);

    beforeEach(() => {
      // Use mockResolvedValue (not Once) so clearAllMocks() fully resets these between tests
      (mockJwtService.signAsync as jest.Mock)
        .mockResolvedValue('new-access-token');
      (mockJwtService.verifyAsync as jest.Mock)
        .mockResolvedValue({ sub: mockUser.id, type: 'refresh' });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
    });

    it('should return new token pair and user when refresh token is valid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        isActive: true,
        refreshToken: storedRefreshHash,
      });

      const result = await service.refreshTokens(mockUser.id, incomingRefreshToken);

      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({ id: mockUser.id }),
      });
    });

    it('should verify the JWT with the refresh secret', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        isActive: true,
        refreshToken: storedRefreshHash,
      });

      await service.refreshTokens(mockUser.id, incomingRefreshToken);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(incomingRefreshToken, {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException without reading the DB when the JWT is invalid or expired', async () => {
      (mockJwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('invalid signature'));

      await expect(
        service.refreshTokens(mockUser.id, incomingRefreshToken),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when the token is an access token', async () => {
      (mockJwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: mockUser.id, type: 'access' });

      await expect(
        service.refreshTokens(mockUser.id, incomingRefreshToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the token belongs to another user', async () => {
      (mockJwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-2', type: 'refresh' });

      await expect(
        service.refreshTokens(mockUser.id, incomingRefreshToken),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should reject a token forged with another secret even if it shares the first 72 bytes', async () => {
      // Antes bastaba con que los primeros 72 bytes coincidieran (bcrypt);
      // aquí la verificación es la real de @nestjs/jwt.
      const realJwt = new JwtService();
      const realToken = realJwt.sign(
        { sub: mockUser.id, username: 'testuser', roleId: 'role-1', type: 'refresh' },
        { secret: 'test-refresh-secret', expiresIn: '7d' },
      );
      const forgedToken = realJwt.sign(
        { sub: mockUser.id, username: 'x', roleId: 'y', type: 'refresh' },
        { secret: 'otro-secreto' },
      );
      expect(forgedToken.slice(0, 72)).toBe(realToken.slice(0, 72));

      (mockJwtService.verifyAsync as jest.Mock).mockImplementation((token: string, options) =>
        realJwt.verifyAsync(token, options),
      );
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        isActive: true,
        refreshToken: sha256(realToken),
      });

      await expect(service.refreshTokens(mockUser.id, forgedToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(mockUser.id, realToken)).resolves.toMatchObject({
        user: expect.objectContaining({ id: mockUser.id }),
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.refreshTokens(mockUser.id, incomingRefreshToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when stored refreshToken is null', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        isActive: true,
        refreshToken: null,
      });

      await expect(
        service.refreshTokens(mockUser.id, incomingRefreshToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the token is not the last one issued', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        isActive: true,
        refreshToken: sha256('newer-refresh-token'),
      });

      await expect(
        service.refreshTokens(mockUser.id, incomingRefreshToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the stored hash is a legacy bcrypt hash', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        isActive: true,
        refreshToken: '$2b$12$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyz01234',
      });

      await expect(
        service.refreshTokens(mockUser.id, incomingRefreshToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not update DB when refresh token is invalid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        isActive: true,
        refreshToken: storedRefreshHash,
      });

      await expect(
        service.refreshTokens(mockUser.id, 'wrong-token'),
      ).rejects.toThrow();

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should update the refreshToken in DB with the SHA-256 of the new token after successful refresh', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        isActive: true,
        refreshToken: storedRefreshHash,
      });
      (mockJwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      await service.refreshTokens(mockUser.id, incomingRefreshToken);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: sha256('new-refresh-token') },
      });
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        isActive: false,
        refreshToken: storedRefreshHash,
      });

      await expect(service.refreshTokens(mockUser.id, incomingRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('no renueva la sesión de quien su rol obliga al doble factor y no lo ha registrado', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        isActive: true,
        refreshToken: storedRefreshHash,
      });
      mockTwoFactorService.mustEnrollBeforeRefresh.mockResolvedValue(true);

      await expect(service.refreshTokens(mockUser.id, incomingRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: null },
      });
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('revoca los equipos de confianza al cambiar la contraseña', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUser.id,
        password: 'hashed',
        isActive: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await service.changePassword(mockUser.id, 'actual123', 'nueva123');

      expect(mockTwoFactorService.revokeAllTrustedDevices).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ─────────────────────────────────────────────
  // logout
  // ─────────────────────────────────────────────
  describe('logout', () => {
    it('should set refreshToken to null in DB', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await service.logout(mockUser.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: null },
      });
    });

    it('should call sessionLogsService.createLogoutLog with userId', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await service.logout(mockUser.id);

      expect(mockSessionLogsService.createLogoutLog).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ─────────────────────────────────────────────
  // getUserProfile
  // ─────────────────────────────────────────────
  describe('getUserProfile', () => {
    it('should return user with flattened permissions as string array', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        isActive: true,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        profilePhoto: null,
        roleId: mockUser.roleId,
        cargoId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: {
          id: 'role-1',
          name: 'admin',
          permissions: [
            { permission: { name: 'read_users' } },
            { permission: { name: 'create_users' } },
          ],
        },
        cargo: null,
      });

      const result = await service.getUserProfile(mockUser.id);

      expect(result.permissions).toEqual(['read_users', 'create_users']);
      expect(result.user).toMatchObject({ id: mockUser.id, email: mockUser.email });
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUser.id,
        isActive: false,
      });

      await expect(service.getUserProfile(mockUser.id)).rejects.toThrow(UnauthorizedException);
      await expect(service.getUserProfile(mockUser.id)).rejects.toThrow('User inactive');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUserProfile('nonexistent-id')).rejects.toThrow(UnauthorizedException);
    });
  });
});
