import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { MembersService } from './members.service.js';
import { MembersController } from './members.controller.js';

@Module({
  imports: [UsersModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
