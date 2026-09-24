import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { MembersModule } from '../members/members.module.js';
import { ClassesService } from './classes.service.js';
import { ClassesController } from './classes.controller.js';

@Module({
  imports: [UsersModule, MembersModule],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
