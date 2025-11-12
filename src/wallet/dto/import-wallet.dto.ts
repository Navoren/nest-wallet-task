import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportWalletDto {
  @ApiProperty({
    description: 'Ethereum private key (64 hex characters with 0x prefix)',
    example:
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    pattern: '^0x[a-fA-F0-9]{64}$',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message:
      'Invalid private key format. Must be 0x followed by 64 hex characters',
  })
  privateKey: string;
}
