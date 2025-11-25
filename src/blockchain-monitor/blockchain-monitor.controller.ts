import { Controller, Get, Post } from '@nestjs/common';
import { BlockchainMonitorService } from './blockchain-monitor.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('monitoring')
@Controller('blockchain-monitor')
export class BlockchainMonitorController {
  constructor(
    private readonly blockchainMonitorService: BlockchainMonitorService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get blockchain monitoring status',
    description:
      'Returns current status of the blockchain scanner including last scanned block and monitored wallets',
  })
  @ApiResponse({
    status: 200,
    description: 'Monitoring status retrieved',
    schema: {
      example: {
        isActive: true,
        lastScannedBlock: 5234567,
        currentBlock: 5234570,
        blocksBehind: 3,
        monitoredWallets: 5,
        nextScanIn: '30 seconds',
      },
    },
  })
  async getStatus() {
    return this.blockchainMonitorService.getMonitoringStatus();
  }

  @Post('scan')
  @ApiOperation({
    summary: 'Trigger manual blockchain scan',
    description:
      'Manually trigger a blockchain scan for external transactions. Useful for testing or catching up quickly.',
  })
  @ApiResponse({
    status: 200,
    description: 'Manual scan triggered',
    schema: {
      example: {
        message: 'Blockchain scan triggered successfully',
      },
    },
  })
  async triggerScan() {
    await this.blockchainMonitorService.triggerScan();
    return {
      message: 'Blockchain scan triggered successfully',
    };
  }
}
