import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../../common/decorators';

// ---------------------------------------------------------------------------
// Helper: build a minimal ExecutionContext
// ---------------------------------------------------------------------------
const makeContext = (): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({}),
    }),
  }) as unknown as ExecutionContext;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => jest.clearAllMocks());

  describe('canActivate', () => {
    it('should return true immediately for routes decorated with @Public()', () => {
      reflector.getAllAndOverride.mockReturnValue(true); // isPublic = true
      const ctx = makeContext();

      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('should check the IS_PUBLIC_KEY metadata on handler and class', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const ctx = makeContext();

      // Spy on super.canActivate to prevent actual JWT validation
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(true as any);

      guard.canActivate(ctx);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
    });

    it('should delegate to parent AuthGuard canActivate for non-public routes', () => {
      reflector.getAllAndOverride.mockReturnValue(false); // isPublic = false
      const ctx = makeContext();

      // Mock the parent class canActivate
      const parentCanActivate = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(true as any);

      guard.canActivate(ctx);

      expect(parentCanActivate).toHaveBeenCalledWith(ctx);
    });

    it('should NOT call parent canActivate for public routes', () => {
      reflector.getAllAndOverride.mockReturnValue(true); // isPublic = true
      const ctx = makeContext();

      const parentCanActivate = jest.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      );

      guard.canActivate(ctx);

      expect(parentCanActivate).not.toHaveBeenCalled();
    });
  });
});
