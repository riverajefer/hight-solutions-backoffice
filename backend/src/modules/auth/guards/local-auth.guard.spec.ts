import { LocalAuthGuard } from './local-auth.guard';
import { AuthGuard } from '@nestjs/passport';

describe('LocalAuthGuard', () => {
  it('should be defined', () => {
    const guard = new LocalAuthGuard();
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard("local")', () => {
    const LocalBase = AuthGuard('local');
    expect(new LocalAuthGuard()).toBeInstanceOf(LocalBase);
  });
});
