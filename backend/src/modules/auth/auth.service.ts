import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload, TokenPair, AuthenticatedUser } from '../../common/interfaces';
import { SessionLogsService } from '../session-logs/session-logs.service';
import { AttendanceService } from '../attendance/attendance.service';
import { TwoFactorMethod, TwoFactorService } from './two-factor.service';

/** Campos con los que se arma el `AuthenticatedUser` del login y del refresh. */
const AUTH_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  isActive: true,
  roleId: true,
  firstName: true,
  lastName: true,
  profilePhoto: true,
  cargoId: true,
  mustChangePassword: true,
  twoFactorEnabled: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
  cargo: {
    select: {
      id: true,
      name: true,
      productionArea: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

type LoginSession = TokenPair & {
  user: AuthenticatedUser;
  permissions: string[];
};

/**
 * Respuesta de `POST /auth/login`. Con `2FA_*` no hay sesión todavía: el
 * frontend completa el segundo paso con el token temporal.
 */
export type LoginResult =
  | ({ status: 'OK' } & LoginSession & {
      deviceToken?: string;
      deviceTokenExpiresAt?: Date;
      backupCodes?: string[];
    })
  | { status: '2FA_REQUIRED'; challengeToken: string }
  | { status: '2FA_SETUP_REQUIRED'; setupToken: string };

type LoginSuccess = Extract<LoginResult, { status: 'OK' }>;

interface RequestOrigin {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SessionLogsService))
    private readonly sessionLogsService: SessionLogsService,
    private readonly attendanceService: AttendanceService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  /**
   * Valida las credenciales del usuario
   * Retorna el usuario sin el password si es válido, null si no
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { ...AUTH_USER_SELECT, password: true },
    });

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return toAuthenticatedUser(user);
  }

  /**
   * Genera tokens y los guarda en la base de datos
   * Llamado después de una autenticación exitosa
   */
  async login(user: AuthenticatedUser): Promise<TokenPair> {
    const tokens = await this.generateTokens(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: this.hashRefreshToken(tokens.refreshToken) },
    });

    return tokens;
  }

  /**
   * Login después de validar la contraseña. Si el usuario debe pasar el doble
   * factor no entrega la sesión: devuelve un token temporal para el segundo paso.
   */
  async loginWithPermissions(
    user: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
    deviceToken?: string,
  ): Promise<LoginResult> {
    const step = await this.twoFactorService.resolveLoginStep(user.id, deviceToken);

    if (step === 'CHALLENGE') {
      return {
        status: '2FA_REQUIRED',
        challengeToken: await this.twoFactorService.issuePendingToken(user, '2fa_challenge'),
      };
    }
    if (step === 'SETUP') {
      return {
        status: '2FA_SETUP_REQUIRED',
        setupToken: await this.twoFactorService.issuePendingToken(user, '2fa_setup'),
      };
    }

    const session = await this.startSession(
      user,
      { ipAddress, userAgent },
      step === 'TRUSTED_DEVICE' ? 'TRUSTED_DEVICE' : null,
    );
    return { status: 'OK', ...session };
  }

  /** Segundo paso del login: el código de la app o uno de respaldo. */
  async completeTwoFactorLogin(
    challengeToken: string,
    code: string,
    rememberDevice: boolean,
    origin: RequestOrigin,
  ): Promise<LoginResult> {
    const { sub: userId } = await this.twoFactorService.verifyPendingToken(
      challengeToken,
      '2fa_challenge',
    );
    const method = await this.twoFactorService.verifyLoginCode(userId, code);
    return this.finishTwoFactorLogin(userId, method, rememberDevice, origin);
  }

  /** Registro obligatorio durante el login: genera el QR. */
  async startLoginEnrollment(setupToken: string) {
    const { sub: userId } = await this.twoFactorService.verifyPendingToken(setupToken, '2fa_setup');
    return this.twoFactorService.startEnrollment(userId);
  }

  /** Registro obligatorio durante el login: confirma el primer código y entrega la sesión. */
  async confirmLoginEnrollment(
    setupToken: string,
    code: string,
    rememberDevice: boolean,
    origin: RequestOrigin,
  ): Promise<LoginResult> {
    const { sub: userId } = await this.twoFactorService.verifyPendingToken(setupToken, '2fa_setup');
    const backupCodes = await this.twoFactorService.confirmEnrollment(userId, code);
    const result = await this.finishTwoFactorLogin(userId, 'TOTP', rememberDevice, origin);
    return { ...result, backupCodes };
  }

  /**
   * Refresca el access token usando el refresh token
   */
  async refreshTokens(userId: string, refreshToken: string): Promise<TokenPair & { user: AuthenticatedUser }> {
    // Firma, expiración, tipo y dueño: sin esto, un token armado a mano con el
    // id de otro usuario pasaba (bcrypt solo compara los primeros 72 bytes, que
    // en un JWT son el header y el inicio del `sub`).
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh' || payload.sub !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...AUTH_USER_SELECT, refreshToken: true },
    });

    if (!user || !user.refreshToken || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Debe ser el último emitido (rotación). Los hashes bcrypt de antes de este
    // cambio no coinciden: esas sesiones vuelven a pedir login una vez.
    const storedHash = Buffer.from(user.refreshToken);
    const incomingHash = Buffer.from(this.hashRefreshToken(refreshToken));
    const isRefreshTokenValid =
      storedHash.length === incomingHash.length &&
      timingSafeEqual(storedHash, incomingHash);

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Una sesión abierta antes de exigir el doble factor no se renueva: el
    // usuario entra de nuevo y registra la app.
    if (await this.twoFactorService.mustEnrollBeforeRefresh(userId)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
      throw new UnauthorizedException(
        'Tu rol exige el doble factor. Inicia sesión de nuevo para activarlo.',
      );
    }

    const authenticatedUser = toAuthenticatedUser(user);

    // Generar nuevos tokens
    const tokens = await this.generateTokens(authenticatedUser);

    // Actualizar el refresh token en la base de datos
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: this.hashRefreshToken(tokens.refreshToken) },
    });

    return {
      ...tokens,
      user: authenticatedUser,
    };
  }

  /**
   * Cierra la sesión del usuario eliminando su refresh token
   */
  async logout(userId: string): Promise<void> {
    // Cerrar registro de asistencia activo si existe
    await this.attendanceService.closeOpenRecordOnLogout(userId);

    // Create logout log
    await this.sessionLogsService.createLogoutLog(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  /**
   * Obtiene el perfil del usuario con sus permisos
   */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        cargo: {
          include: {
            productionArea: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User inactive');
    }

    // Extraer solo los nombres de los permisos
    const permissions = user.role.permissions.map((rp: any) => rp.permission.name);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePhoto: user.profilePhoto,
        roleId: user.roleId,
        cargoId: user.cargoId,
        mustChangePassword: user.mustChangePassword,
        twoFactorEnabled: user.twoFactorEnabled,
        role: {
          id: user.role.id,
          name: user.role.name,
        },
        cargo: user.cargo ? {
          id: user.cargo.id,
          name: user.cargo.name,
          productionArea: user.cargo.productionArea ? {
            id: user.cargo.productionArea.id,
            name: user.cargo.productionArea.name,
          } : null,
        } : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      permissions,
    };
  }

  /**
   * Actualiza la foto de perfil del usuario
   */
  async updateProfilePhoto(userId: string, profilePhoto: string | null) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhoto },
      select: {
        id: true,
        profilePhoto: true,
      },
    });

    return user;
  }

  /**
   * Verifica la contraseña del usuario autenticado
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    return true;
  }

  /**
   * Cambia la contraseña del usuario autenticado
   * Limpia el flag mustChangePassword al completar el cambio
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    // Quien cambia la contraseña por sospecha de robo también corta los
    // navegadores que saltaban el doble factor.
    await this.twoFactorService.revokeAllTrustedDevices(userId);
  }

  /**
   * Emite la sesión: tokens, permisos y registro de ingreso.
   * `twoFactorMethod` es null cuando el doble factor no aplicó.
   */
  private async startSession(
    user: AuthenticatedUser,
    origin: RequestOrigin,
    twoFactorMethod: TwoFactorMethod | null,
  ): Promise<LoginSession> {
    const tokens = await this.login(user);
    const permissions = await this.getUserPermissions(user.id);

    await this.sessionLogsService.createLoginLog(
      user.id,
      origin.ipAddress,
      origin.userAgent,
      twoFactorMethod,
    );

    return { ...tokens, user, permissions };
  }

  private async finishTwoFactorLogin(
    userId: string,
    method: TwoFactorMethod,
    rememberDevice: boolean,
    origin: RequestOrigin,
  ): Promise<LoginSuccess> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: AUTH_USER_SELECT,
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const session = await this.startSession(toAuthenticatedUser(user), origin, method);
    if (!rememberDevice) {
      return { status: 'OK', ...session };
    }

    const device = await this.twoFactorService.createTrustedDevice(
      userId,
      origin.userAgent,
      origin.ipAddress,
    );
    return {
      status: 'OK',
      ...session,
      deviceToken: device.deviceToken,
      deviceTokenExpiresAt: device.expiresAt,
    };
  }

  /**
   * Genera un par de tokens (access + refresh)
   */
  private async generateTokens(user: AuthenticatedUser): Promise<TokenPair> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * SHA-256 del refresh token. No bcrypt: trunca en 72 bytes y un JWT es más
   * largo. Un token firmado ya es aleatorio, así que no hace falta sal.
   */
  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  /**
   * Obtiene los permisos de un usuario por su ID
   */
  private async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    if (!user.isActive) {
      return [];
    }

    return user.role.permissions.map((rp: any) => rp.permission.name);
  }
}

function toAuthenticatedUser(user: {
  id: string;
  username: string | null;
  email: string | null;
  roleId: string;
  firstName: string | null;
  lastName: string | null;
  profilePhoto: string | null;
  cargoId: string | null;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  role: AuthenticatedUser['role'];
  cargo: AuthenticatedUser['cargo'];
}): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username!,
    email: user.email,
    roleId: user.roleId,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePhoto: user.profilePhoto,
    cargoId: user.cargoId,
    mustChangePassword: user.mustChangePassword,
    twoFactorEnabled: user.twoFactorEnabled,
    role: user.role,
    cargo: user.cargo,
  };
}
