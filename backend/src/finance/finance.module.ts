import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { ExpensesModule } from '../expenses/expenses.module.js';
import { FinanceService } from './finance.service.js';
import { FinanceController } from './finance.controller.js';

@Module({
  imports: [PaymentsModule, ExpensesModule],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
