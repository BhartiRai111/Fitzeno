import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module.js';
import { ClassBookingsService } from './class-bookings.service.js';
import { ClassBookingsController } from './class-bookings.controller.js';

@Module({
  imports: [MembersModule],
  controllers: [ClassBookingsController],
  providers: [ClassBookingsService],
  exports: [ClassBookingsService],
})
export class ClassBookingsModule {}
