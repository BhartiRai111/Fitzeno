import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module.js';
import { MembershipPlansModule } from '../membership-plans/membership-plans.module.js';
import { MembershipsService } from './memberships.service.js';
import { MembershipsController } from './memberships.controller.js';

@Module({
  imports: [MembersModule, MembershipPlansModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
