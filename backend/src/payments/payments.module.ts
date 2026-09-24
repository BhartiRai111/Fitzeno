import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module.js';
import { TransactionsService } from './transactions.service.js';
import { TransactionsController } from './transactions.controller.js';
import { InvoicesService } from './invoices.service.js';
import { InvoicesController } from './invoices.controller.js';
import { RefundsService } from './refunds.service.js';
import { RefundsController } from './refunds.controller.js';

@Module({
  imports: [MembersModule],
  controllers: [TransactionsController, InvoicesController, RefundsController],
  providers: [TransactionsService, InvoicesService, RefundsService],
  exports: [TransactionsService, InvoicesService],
})
export class PaymentsModule {}
