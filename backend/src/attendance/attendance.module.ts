import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { CredentialsModule } from '../auth/credentials.module.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';

@Module({
  imports: [MembersModule, MembershipsModule, CredentialsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
