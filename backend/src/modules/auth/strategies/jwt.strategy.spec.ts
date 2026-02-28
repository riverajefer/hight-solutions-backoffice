import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../database/prisma.service.mock';
import { JwtPayload } from '../../../common/interfaces';

// ConfigService debe retornar el secret antes de que PassportStrategy lo use
// en su constructor. Lo definimos antes del módulo de test.
const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-access-secret',
    };
    return config[key];
  }),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: MockPrismaService;

  const validAccessPayload: JwtPayload = {
    sub: 'user-1',
    username: 'testuser',
    roleId: 'role-1',
    type: 'access',
  };

  const refreshPayload: JwtPayload = {
    ...validAccessPayload,
    type: 'refresh',
  };

  const mockUserFromDb = {
    id: 'user-1',
    email: 'test@example.com',
    roleId: 'role-1',
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // validate
  // ─────────────────────────────────────────────
  describe('validate', () => {
    it('should return AuthenticatedUser when payload is a valid access token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserFromDb);

      const result = await strategy.validate(validAccessPayload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        roleId: 'role-1',
      });
    });

    it('should query prisma with the userId from the payload (sub)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserFromDb);

      await strategy.validate(validAccessPayload);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: validAccessPayload.sub } }),
      );
    });

    it('should throw UnauthorizedException when token type is "refresh"', async () => {
      await expect(strategy.validate(refreshPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(refreshPayload)).rejects.toThrow('Invalid token type');
      // No debe consultar la DB si el tipo de token es incorrecto
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user does not exist in DB', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow('User not found');
    });
  });
});
