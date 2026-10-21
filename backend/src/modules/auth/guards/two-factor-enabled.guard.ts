import { CanActivate, Injectable } from '@nestjs/common';
import { TwoFactorService } from '../two-factor.service';

/** Con `TWO_FACTOR_ENFORCEMENT=off` los endpoints del doble factor responden 403. */
@Injectable()
export class TwoFactorEnabledGuard implements CanActivate {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  canActivate(): boolean {
    this.twoFactorService.assertFeatureEnabled();
    return true;
  }
}
