import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard, JwtAuthGuard } from './guards';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto';
import { CurrentUser, Public } from '../../common/decorators';
import { AuthenticatedUser, TokenPair } from '../../common/interfaces';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Autentica un usuario con email y password
   * Retorna access token y refresh token
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() _loginDto: LoginDto, // Validación del DTO
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TokenPair & { user: AuthenticatedUser; permissions: string[] }> {
    return this.authService.loginWithPermissions(user);
  }

  /**
   * POST /api/v1/auth/register
   * Registra un nuevo usuario
   * Retorna access token y refresh token
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<TokenPair> {
    return this.authService.register(registerDto);
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresca el access token usando el refresh token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenPair & { user: AuthenticatedUser }> {
    return this.authService.refreshTokens(
      refreshTokenDto.userId,
      refreshTokenDto.refreshToken,
    );
  }

  /**
   * POST /api/v1/auth/logout
   * Cierra la sesión del usuario (invalida el refresh token)
   */
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId);
    return { message: 'Logged out successfully' };
  }

  /**
   * POST /api/v1/auth/me
   * Retorna información del usuario autenticado con sus permisos
   */
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(
    @CurrentUser('id') userId: string,
  ): Promise<{ user: any; permissions: string[] }> {
    return this.authService.getUserProfile(userId);
  }
}
