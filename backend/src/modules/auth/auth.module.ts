import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy, JwtStrategy } from './strategies';
import { JwtAuthGuard, LocalAuthGuard } from './guards';
import { SessionLogsModule } from '../session-logs/session-logs.module';

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
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
