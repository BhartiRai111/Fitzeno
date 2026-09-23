import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { MembersModule } from '../members/members.module.js';
import { LeadsService } from './leads.service.js';
import { LeadsController } from './leads.controller.js';

@Module({
  imports: [UsersModule, MembersModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
