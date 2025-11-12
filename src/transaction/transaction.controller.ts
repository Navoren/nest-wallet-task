import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { BlockchainService } from 'src/blockchain/blockchain.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponse } from '../@types/transaction-job.types';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly blockchainService: BlockchainService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create and send transaction',
    description:
      'Creates a new transaction and broadcasts it to the Sepolia blockchain. The transaction will be processed asynchronously and confirmed after blockchain validation.',
  })
  @ApiBody({
    type: CreateTransactionDto,
    examples: {
      example1: {
        summary: 'Send 0.01 ETH',
        value: {
          from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          amountInEth: '0.01',
        },
      },
      example2: {
        summary: 'Send 1 ETH',
        value: {
          from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          amountInEth: '1.0',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction created and sent to blockchain',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        amount: '10000000000000000',
        amountInEth: '0.01',
        transactionHash:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        status: 'pending',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or invalid parameters',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async createTransaction(
    @Body() createTransactionDto: CreateTransactionDto,
  ): Promise<TransactionResponse> {
    const { from, to, amountInEth } = createTransactionDto;
    const transaction = await this.transactionService.createTransaction(
      from,
      to,
      amountInEth,
    );

    return {
      ...transaction,
      amountInEth: this.blockchainService.formatEther(transaction.amount),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get transaction details',
    description:
      'Retrieve transaction information including status, block number, and gas details. Status can be: pending, confirmed, or failed.',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction found',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        amount: '10000000000000000',
        amountInEth: '0.01',
        blockNumber: 5234567,
        transactionHash:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        status: 'confirmed',
        gasUsed: '21000',
        effectiveGasPrice: '1500000000',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('id') id: string): Promise<TransactionResponse> {
    const transaction = await this.transactionService.getTransaction(id);

    return {
      ...transaction,
      amountInEth: this.blockchainService.formatEther(transaction.amount),
    };
  }
}
