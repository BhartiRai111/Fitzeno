import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module.js';
import { TrainersModule } from '../trainers/trainers.module.js';
import { PtSessionsService } from './pt-sessions.service.js';
import { PtSessionsController } from './pt-sessions.controller.js';

@Module({
  imports: [MembersModule, TrainersModule],
  controllers: [PtSessionsController],
  providers: [PtSessionsService],
  exports: [PtSessionsService],
})
export class PtSessionsModule {}
