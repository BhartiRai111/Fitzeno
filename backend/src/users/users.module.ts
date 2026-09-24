import { Module } from '@nestjs/common';
import { CredentialsModule } from '../auth/credentials.module.js';
import { AuthzModule } from '../authz/authz.module.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [CredentialsModule, AuthzModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
