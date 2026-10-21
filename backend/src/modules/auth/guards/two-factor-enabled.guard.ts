import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TwoFactorService } from '../two-factor.service';

const ALLOW_WHEN_TWO_FACTOR_OFF = 'allowWhenTwoFactorOff';

/**
 * Deja pasar la ruta aunque el doble factor esté apagado. Para el estado: el
 * perfil lo consulta siempre, y un 403 ahí mostraría un error en pantalla.
 */
export const AllowWhenTwoFactorOff = () => SetMetadata(ALLOW_WHEN_TWO_FACTOR_OFF, true);

/** Con `TWO_FACTOR_ENFORCEMENT=off` los endpoints del doble factor responden 403. */
@Injectable()
export class TwoFactorEnabledGuard implements CanActivate {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_WHEN_TWO_FACTOR_OFF, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed) {
      this.twoFactorService.assertFeatureEnabled();
    }
    return true;
  }
}
