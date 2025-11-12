import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { RedisModule } from 'src/helpers/redis/redis.module';
import { BlockchainModule } from 'src/blockchain/blockchain.module';

@Module({
  imports: [RedisModule, BlockchainModule],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
