import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Sender wallet address (must exist in system)',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    pattern: '^0x[a-fA-F0-9]{40}$',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Invalid Ethereum address format for "from" field',
  })
  from: string;

  @ApiProperty({
    description: 'Recipient wallet address',
    example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    pattern: '^0x[a-fA-F0-9]{40}$',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Invalid Ethereum address format for "to" field',
  })
  to: string;

  @ApiProperty({
    description: 'Amount to send in ETH (e.g., "0.01" for 0.01 ETH)',
    example: '0.01',
    pattern: '^\\d+(\\.\\d+)?$',
  })
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'Amount must be a valid number string (e.g., "0.01")',
  })
  amountInEth: string;
}
