import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { TrainersService } from './trainers.service.js';
import { TrainersController } from './trainers.controller.js';

@Module({
  imports: [UsersModule],
  controllers: [TrainersController],
  providers: [TrainersService],
  exports: [TrainersService],
})
export class TrainersModule {}
