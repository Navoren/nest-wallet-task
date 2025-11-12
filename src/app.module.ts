import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Queue } from 'bull';

import { RedisModule } from './helpers/redis/redis.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { QueueModule } from './queue/queue.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { BullBoardModule } from './helpers/bull-board/bull-board.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    RedisModule,
    BlockchainModule,
    QueueModule,
    WalletModule,
    TransactionModule,
    BullBoardModule.forRoot(),
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    @InjectQueue('transactions')
    private readonly transactionQueue: Queue,

    @Inject('BULL_BOARD_ADAPTER')
    private readonly serverAdapter: ExpressAdapter,
  ) {}

  onModuleInit(): void {
    createBullBoard({
      queues: [new BullAdapter(this.transactionQueue)],
      serverAdapter: this.serverAdapter,
    });
  }

  getServerAdapter(): ExpressAdapter {
    return this.serverAdapter;
  }
}
