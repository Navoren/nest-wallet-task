import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TransactionProcessor } from './processsors/transaction.processor';
import { QueueService } from '../queue/queue.service';
import { RedisModule } from '../helpers/redis/redis.module';
import { WalletModule } from '../wallet/wallet.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'transactions',
    }),
    RedisModule,
    WalletModule,
    BlockchainModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService, TransactionProcessor, QueueService],
  exports: [TransactionService],
})
export class TransactionModule {}
