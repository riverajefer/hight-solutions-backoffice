import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public } from '../../common/decorators';
import { AuthService, LoginResult } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { AllowWhenTwoFactorOff, JwtAuthGuard, TwoFactorEnabledGuard } from './guards';
import {
  ConfirmTwoFactorEnrollmentDto,
  DisableTwoFactorDto,
  StartTwoFactorEnrollmentDto,
  TwoFactorCodeDto,
  VerifyTwoFactorLoginDto,
} from './dto';
import { getRequestOrigin } from './request-origin.util';

/**
 * Doble factor (TOTP). Los tres primeros endpoints son el segundo paso del
 * login y se autentican con el token temporal; el resto es la autogestión
 * desde el perfil, con la sesión normal.
 */
@ApiTags('auth')
@Controller('auth/2fa')
@UseGuards(TwoFactorEnabledGuard)
export class TwoFactorController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  // ─── Segundo paso del login ───────────────────────────────────────────────

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Segundo paso del login: código de la app o de respaldo' })
  @ApiResponse({ status: 401, description: 'Código incorrecto o token temporal vencido' })
  @ApiResponse({ status: 429, description: 'Bloqueado por intentos fallidos' })
  verify(@Body() dto: VerifyTwoFactorLoginDto, @Req() request: Request): Promise<LoginResult> {
    return this.authService.completeTwoFactorLogin(
      dto.challengeToken,
      dto.code,
      dto.rememberDevice ?? false,
      getRequestOrigin(request),
    );
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  @Post('enrollment/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registro obligatorio en el login: genera el QR' })
  startLoginEnrollment(@Body() dto: StartTwoFactorEnrollmentDto) {
    return this.authService.startLoginEnrollment(dto.setupToken);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  @Post('enrollment/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registro obligatorio en el login: confirma el primer código y entrega la sesión' })
  confirmLoginEnrollment(
    @Body() dto: ConfirmTwoFactorEnrollmentDto,
    @Req() request: Request,
  ): Promise<LoginResult> {
    return this.authService.confirmLoginEnrollment(
      dto.setupToken,
      dto.code,
      dto.rememberDevice ?? false,
      getRequestOrigin(request),
    );
  }

  // ─── Autogestión (sesión normal) ──────────────────────────────────────────

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @AllowWhenTwoFactorOff()
  @Get('status')
  @ApiOperation({ summary: 'Estado del doble factor del usuario autenticado (responde aunque esté apagado)' })
  status(@CurrentUser('id') userId: string) {
    return this.twoFactorService.getStatus(userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activación voluntaria: genera el QR' })
  setup(@CurrentUser('id') userId: string) {
    return this.twoFactorService.startEnrollment(userId);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activación voluntaria: confirma el primer código y devuelve los códigos de respaldo' })
  async enable(@CurrentUser('id') userId: string, @Body() dto: TwoFactorCodeDto) {
    const backupCodes = await this.twoFactorService.confirmEnrollment(userId, dto.code);
    return { backupCodes };
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactiva el doble factor (no si el rol lo exige)' })
  async disable(@CurrentUser('id') userId: string, @Body() dto: DisableTwoFactorDto) {
    await this.authService.verifyPassword(userId, dto.password);
    await this.twoFactorService.disable(userId, dto.code);
    return { message: 'Doble factor desactivado' };
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('backup-codes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Genera 10 códigos de respaldo nuevos; los anteriores dejan de servir' })
  async regenerateBackupCodes(@CurrentUser('id') userId: string, @Body() dto: TwoFactorCodeDto) {
    const backupCodes = await this.twoFactorService.regenerateBackupCodes(userId, dto.code);
    return { backupCodes };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('trusted-devices')
  @ApiOperation({ summary: 'Navegadores de confianza del usuario autenticado' })
  trustedDevices(@CurrentUser('id') userId: string) {
    return this.twoFactorService.listTrustedDevices(userId);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Delete('trusted-devices/:id')
  @ApiOperation({ summary: 'Revoca un navegador de confianza' })
  async revokeTrustedDevice(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) deviceId: string,
  ) {
    await this.twoFactorService.revokeTrustedDevice(userId, deviceId);
    return { message: 'Equipo de confianza revocado' };
  }
}
