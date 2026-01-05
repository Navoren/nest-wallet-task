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
import { BlockchainMonitorModule } from './blockchain-monitor/blockchain-monitor.module';

const isWorker = process.env.RUN_WORKER;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Redis + Bull is shared (API produces jobs, worker consumes)
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }),

    RedisModule,
    BlockchainModule,

    WalletModule,
    TransactionModule,

    // 🧠 ONLY API (Vercel)
    ...(!isWorker
      ? [
          QueueModule, // producers only
          BullBoardModule.forRoot(),
        ]
      : []),

    // 🧠 ONLY WORKER (Railway)
    ...(isWorker
      ? [
          QueueModule, // processors
          BlockchainMonitorModule,
        ]
      : []),
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
    // 🚨 Bull Board MUST NOT run on workers
    if (isWorker) return;

    createBullBoard({
      queues: [new BullAdapter(this.transactionQueue)],
      serverAdapter: this.serverAdapter,
    });
  }

  // Used by main.ts / Vercel adapter
  getServerAdapter(): ExpressAdapter {
    return this.serverAdapter;
  }
}
