import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { ImportWalletDto } from './dto/import-wallet.dto';
import { WalletResponse, WalletBalance } from '../@types/wallet.types';

@ApiTags('wallets')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new wallet',
    description:
      'Generates a new Ethereum wallet with address and private key. **IMPORTANT**: Save the private key securely - it will not be shown again!',
  })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully',
    schema: {
      example: {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        balance: '0',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  async createWallet(): Promise<WalletResponse> {
    const wallet = await this.walletService.createWallet();
    return {
      address: wallet.address,
      balance: wallet.balance,
      privateKey: wallet.privateKey,
    };
  }

  @Post('import')
  @ApiOperation({
    summary: 'Import existing wallet',
    description: 'Import an existing Ethereum wallet using its private key',
  })
  @ApiBody({
    type: ImportWalletDto,
    examples: {
      example1: {
        summary: 'Import wallet example',
        value: {
          privateKey:
            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Wallet imported successfully',
    schema: {
      example: {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        balance: '0',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid private key format' })
  async importWallet(
    @Body() importWalletDto: ImportWalletDto,
  ): Promise<WalletResponse> {
    const wallet = await this.walletService.importWallet(
      importWalletDto.privateKey,
    );
    return {
      address: wallet.address,
      balance: wallet.balance,
    };
  }

  @Get(':address')
  @ApiOperation({
    summary: 'Get wallet information',
    description: 'Retrieve stored wallet information from Redis',
  })
  @ApiParam({
    name: 'address',
    description: 'Ethereum wallet address (0x prefixed)',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet found',
    schema: {
      example: {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        balance: '0',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWallet(@Param('address') address: string): Promise<WalletResponse> {
    const wallet = await this.walletService.getWallet(address);
    return {
      address: wallet.address,
      balance: wallet.balance,
    };
  }

  @Get(':address/balance')
  @ApiOperation({
    summary: 'Get real-time balance from blockchain',
    description:
      'Fetches the current balance directly from the Sepolia blockchain',
  })
  @ApiParam({
    name: 'address',
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved from blockchain',
    schema: {
      example: {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        balance: '1000000000000000000',
        balanceInEth: '1.0',
      },
    },
  })
  async getBalance(@Param('address') address: string): Promise<WalletBalance> {
    return this.walletService.getBalance(address);
  }

  @Get(':address/transactions')
  @ApiOperation({
    summary: 'Get wallet transaction history',
    description: 'Retrieve all transaction IDs associated with this wallet',
  })
  @ApiParam({
    name: 'address',
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: 'List of transaction IDs',
    schema: {
      example: [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ],
    },
  })
  async getWalletTransactions(
    @Param('address') address: string,
  ): Promise<string[]> {
    return this.walletService.getTransactions(address);
  }
}
