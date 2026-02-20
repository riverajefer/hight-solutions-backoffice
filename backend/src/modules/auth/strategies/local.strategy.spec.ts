import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

const mockAuthService = {
  validateUser: jest.fn(),
};

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    roleId: 'role-1',
    firstName: 'John',
    lastName: 'Doe',
    profilePhoto: null,
    cargoId: null,
    role: { id: 'role-1', name: 'admin' },
    cargo: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // validate
  // ─────────────────────────────────────────────
  describe('validate', () => {
    it('should return the user when credentials are valid', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate('test@example.com', 'correct-password');

      expect(result).toEqual(mockUser);
    });

    it('should call authService.validateUser with email and password', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      await strategy.validate('test@example.com', 'my-password');

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'my-password',
      );
    });

    it('should throw UnauthorizedException when authService.validateUser returns null', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('wrong@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate('wrong@example.com', 'wrong-password'),
      ).rejects.toThrow('Invalid email or password');
    });
  });
});
