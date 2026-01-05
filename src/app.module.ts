import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';

import { RedisModule } from './helpers/redis/redis.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { QueueModule } from './queue/queue.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { BullBoardModule } from './helpers/bull-board/bull-board.module';
import { BlockchainMonitorModule } from './blockchain-monitor/blockchain-monitor.module';

const isWorker = process.env.RUN_WORKER === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

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

    // API-only (Vercel)
    ...(!isWorker
      ? [
          QueueModule, // producers
          BullBoardModule.forRoot(),
        ]
      : []),

    // Worker-only (Railway)
    ...(isWorker
      ? [
          QueueModule, // processors
          BlockchainMonitorModule,
        ]
      : []),
  ],
})
export class AppModule {}
