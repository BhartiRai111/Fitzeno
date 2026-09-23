import { Module } from '@nestjs/common';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

/**
 * PasswordService and TokenService pulled into their own module (rather
 * than living directly in AuthModule's providers) so UsersModule can use
 * them too — for the staff-invite flow's throwaway password — without
 * creating an AuthModule <-> UsersModule import cycle (AuthModule needs
 * UsersService; if UsersModule needed AuthModule back for just these two
 * stateless utilities, that's a cycle for no real reason).
 */
@Module({
  providers: [PasswordService, TokenService],
  exports: [PasswordService, TokenService],
})
export class CredentialsModule {}
