import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy, JwtStrategy } from './strategies';
import { JwtAuthGuard, LocalAuthGuard, TwoFactorEnabledGuard } from './guards';
import { SessionLogsModule } from '../session-logs/session-logs.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { RolesModule } from '../roles/roles.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorRepository } from './two-factor.repository';
import { TwoFactorService } from './two-factor.service';
import { UsersTwoFactorController } from './users-two-factor.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_ACCESS_SECRET')
        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET must be defined');
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get('JWT_ACCESS_EXPIRATION') || '15m',
          },
        };
      },
    }),
    forwardRef(() => SessionLogsModule),
    AttendanceModule,
    RolesModule,
    NotificationsModule,
  ],
  controllers: [AuthController, TwoFactorController, UsersTwoFactorController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
    TwoFactorService,
    TwoFactorRepository,
    TwoFactorEnabledGuard,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
