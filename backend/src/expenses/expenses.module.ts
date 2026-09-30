import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service.js';
import { ExpensesController } from './expenses.controller.js';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
