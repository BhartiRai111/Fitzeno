import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service.js';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../../common/types/jwt-payload.interface.js';

/**
 * Validates the bearer token on every guarded request and re-fetches the
 * user, rather than trusting the token payload verbatim — so a disabled or
 * deleted account loses access immediately instead of waiting out the
 * token's TTL.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account is no longer active.');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };
  }
}
