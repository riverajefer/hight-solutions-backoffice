import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { SessionLogsService } from '../session-logs/session-logs.service';
import { createMockPrismaService, MockPrismaService } from '../../database/prisma.service.mock';
import { AuthenticatedUser } from '../../common/interfaces';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Import after mock so we get the mocked version
import * as bcrypt from 'bcrypt';

const mockJwtService = {
  signAsync: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
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
        expect.objectContaining({ where: { email: 'test@example.com' } }),
      );
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
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      (prisma.user.update as jest.Mock).mockResolvedValue({});
    });

    it('should return access and refresh tokens', async () => {
      const result = await service.login(mockUser);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should hash the refresh token with 12 salt rounds before saving', async () => {
      await service.login(mockUser);

      expect(bcrypt.hash).toHaveBeenCalledWith('mock-refresh-token', 12);
    });

    it('should update the user refreshToken in DB with the hashed value', async () => {
      await service.login(mockUser);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: 'hashed-refresh-token' },
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
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      // getUserPermissions call
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: {
          permissions: [{ permission: { name: 'read_users' } }],
        },
      });
    });

    it('should return tokens, user, and permissions', async () => {
      const result = await service.loginWithPermissions(mockUser, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toMatchObject({
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
      );
    });

    it('should return empty permissions array when user role has no permissions', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { permissions: [] },
      });

      const result = await service.loginWithPermissions(mockUser);

      expect(result.permissions).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // refreshTokens
  // ─────────────────────────────────────────────
  describe('refreshTokens', () => {
    const storedRefreshHash = 'stored-hashed-refresh-token';

    beforeEach(() => {
      // Use mockResolvedValue (not Once) so clearAllMocks() fully resets these between tests
      (mockJwtService.signAsync as jest.Mock)
        .mockResolvedValue('new-access-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh-token');
      (prisma.user.update as jest.Mock).mockResolvedValue({});
    });

    it('should return new token pair and user when refresh token is valid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        refreshToken: storedRefreshHash,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.refreshTokens(mockUser.id, 'incoming-refresh-token');

      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({ id: mockUser.id }),
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.refreshTokens('nonexistent-id', 'some-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when stored refreshToken is null', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        refreshToken: null,
      });

      await expect(
        service.refreshTokens(mockUser.id, 'some-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when refresh token hash does not match', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        refreshToken: storedRefreshHash,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens(mockUser.id, 'wrong-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not update DB when refresh token is invalid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        refreshToken: storedRefreshHash,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens(mockUser.id, 'wrong-token'),
      ).rejects.toThrow();

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should update the refreshToken in DB with a new hash after successful refresh', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserFromDb,
        refreshToken: storedRefreshHash,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.refreshTokens(mockUser.id, 'valid-refresh-token');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: 'new-hashed-refresh-token' },
      });
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
  // register
  // ─────────────────────────────────────────────
  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'plain-password',
      roleId: 'role-1',
    };

    it('should create user with hashed password and return token pair', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null); // email check
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role-1', name: 'user' });
      // register() hashes password first, then login() hashes the refresh token
      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce('hashed-password')
        .mockResolvedValueOnce('hashed-refresh-token');
      (mockJwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-id',
        email: registerDto.email,
        roleId: registerDto.roleId,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: registerDto.email,
            password: 'hashed-password',
            roleId: registerDto.roleId,
          }),
        }),
      );
      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });

    it('should throw BadRequestException when email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing', email: registerDto.email });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Email already registered');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when roleId is invalid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Invalid role ID');
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

    it('should throw UnauthorizedException when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUserProfile('nonexistent-id')).rejects.toThrow(UnauthorizedException);
    });
  });
});
