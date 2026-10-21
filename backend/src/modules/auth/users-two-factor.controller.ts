import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { AuthenticatedUser } from '../../common/interfaces';
import { JwtAuthGuard } from './guards';
import { SetTwoFactorRequirementDto } from './dto';
import { TwoFactorService } from './two-factor.service';

/**
 * Doble factor de otros usuarios: restablecerlo y exigirlo. Vive en el módulo de auth
 * porque es donde está el doble factor; la ruta cuelga de /users.
 */
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersTwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  /**
   * POST /api/v1/users/:id/2fa/reset
   * Requiere permiso: reset_user_2fa
   */
  @Post(':id/2fa/reset')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('reset_user_2fa')
  @ApiOperation({ summary: 'Restablece el doble factor de un usuario y cierra sus sesiones' })
  @ApiResponse({ status: 403, description: 'Sin permiso, el propio usuario o un rol superior al tuyo' })
  reset(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.twoFactorService.resetForUser(currentUser, id);
  }

  /**
   * PATCH /api/v1/users/:id/2fa/requirement
   * Requiere permiso: require_user_2fa
   */
  @Patch(':id/2fa/requirement')
  @RequirePermissions('require_user_2fa')
  @ApiOperation({ summary: 'Exige (o deja de exigir) el doble factor a un usuario puntual' })
  @ApiResponse({ status: 403, description: 'Sin permiso o un rol superior al tuyo' })
  setRequirement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetTwoFactorRequirementDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.twoFactorService.setRequirementForUser(currentUser, id, dto.required);
  }
}
