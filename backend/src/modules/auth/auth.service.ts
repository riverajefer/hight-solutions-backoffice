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
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload, TokenPair, AuthenticatedUser } from '../../common/interfaces';
import { RegisterDto } from './dto';
import { SessionLogsService } from '../session-logs/session-logs.service';
import { AttendanceService } from '../attendance/attendance.service';

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
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        password: true,
        roleId: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        cargoId: true,
        mustChangePassword: true,
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
            area: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
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
      role: user.role,
      cargo: user.cargo,
    };
  }

  /**
   * Genera tokens y los guarda en la base de datos
   * Llamado después de una autenticación exitosa
   */
  async login(user: AuthenticatedUser): Promise<TokenPair> {
    const tokens = await this.generateTokens(user);

    // Hashear y guardar el refresh token
    const hashedRefreshToken = await bcrypt.hash(
      tokens.refreshToken,
      this.SALT_ROUNDS,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return tokens;
  }

  /**
   * Login que retorna los tokens y los permisos del usuario
   */
  async loginWithPermissions(
    user: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair & { user: AuthenticatedUser; permissions: string[] }> {
    const tokens = await this.login(user);
    const permissions = await this.getUserPermissions(user.id);

    // Create session log
    await this.sessionLogsService.createLoginLog(user.id, ipAddress, userAgent);

    return {
      ...tokens,
      user,
      permissions,
    };
  }

  /**
   * Registra un nuevo usuario
   */
  async register(registerDto: RegisterDto): Promise<TokenPair> {
    // Verificar si el email ya existe (si se proporcionó)
    if (registerDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already registered');
      }
    }

    // Verificar si el rol existe
    const role = await this.prisma.role.findUnique({
      where: { id: registerDto.roleId },
    });

    if (!role) {
      throw new BadRequestException('Invalid role ID');
    }

    // Hashear el password
    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.SALT_ROUNDS,
    );

    // Generar username desde email si no se proporciona uno
    const usernameBase = registerDto.email
      ? registerDto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
      : 'user';
    let username = usernameBase;
    let counter = 1;
    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${usernameBase}${counter}`;
      counter++;
    }

    // Crear el usuario
    const user = await this.prisma.user.create({
      data: {
        username,
        email: registerDto.email,
        password: hashedPassword,
        roleId: registerDto.roleId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        roleId: true,
      },
    });

    // Generar y retornar tokens
    return this.login({ ...user, username: user.username! } as AuthenticatedUser);
  }

  /**
   * Refresca el access token usando el refresh token
   */
  async refreshTokens(userId: string, refreshToken: string): Promise<TokenPair & { user: AuthenticatedUser }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
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
        refreshToken: true,
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
            area: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.refreshToken || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verificar el refresh token contra el hash almacenado
    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      username: user.username!,
      email: user.email,
      roleId: user.roleId,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePhoto: user.profilePhoto,
      cargoId: user.cargoId,
      mustChangePassword: user.mustChangePassword,
      role: user.role,
      cargo: user.cargo,
    };

    // Generar nuevos tokens
    const tokens = await this.generateTokens(authenticatedUser);

    // Actualizar el refresh token en la base de datos
    const hashedRefreshToken = await bcrypt.hash(
      tokens.refreshToken,
      this.SALT_ROUNDS,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
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
            area: true,
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
        role: {
          id: user.role.id,
          name: user.role.name,
        },
        cargo: user.cargo ? {
          id: user.cargo.id,
          name: user.cargo.name,
          area: user.cargo.area ? {
            id: user.cargo.area.id,
            name: user.cargo.area.name,
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
