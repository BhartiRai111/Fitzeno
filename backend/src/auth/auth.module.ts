import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module.js';
import { MembersModule } from '../members/members.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CredentialsModule } from './credentials.module.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

/**
 * The authentication vertical slice: register/login/refresh/logout/me/
 * password-reset/change-password, plus the JWT strategy JwtAuthGuard
 * relies on. Built on UsersService (identity persistence) and
 * CredentialsModule (hashing/tokens) rather than owning either directly —
 * keeps "how a User is stored" and "how a password is hashed" each in one
 * place, reusable by whatever needs them next (the staff-invite flow in
 * UsersModule already does).
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<number>('jwt.accessTokenTtlSeconds'),
        },
      }),
    }),
    CredentialsModule,
    UsersModule,
    MembersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
