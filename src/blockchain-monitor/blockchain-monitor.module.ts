import { Module } from '@nestjs/common';
import { BlockchainMonitorService } from './blockchain-monitor.service';
import { ScheduleModule } from '@nestjs/schedule';
import { BlockchainMonitorController } from './blockchain-monitor.controller';
import { RedisService } from 'src/helpers/redis/redis.service';

@Module({
  providers: [BlockchainMonitorService, RedisService],
  exports: [BlockchainMonitorService],
  imports: [ScheduleModule.forRoot()],
  controllers: [BlockchainMonitorController],
})
export class BlockchainMonitorModule {}
