import { Injectable, NotFoundException } from '@nestjs/common';
import { BlockchainService } from 'src/blockchain/blockchain.service';
import { RedisService } from 'src/helpers/redis/redis.service';
import { Wallet, WalletBalance } from '../@types/wallet.types';

@Injectable()
export class WalletService {
  constructor(
    private readonly redisService: RedisService,
    private readonly blockchainService: BlockchainService,
  ) {}

  async createWallet(): Promise<Wallet> {
    const ethWallet = this.blockchainService.createWallet();

    const wallet: Wallet = {
      address: ethWallet.address,
      privateKey: ethWallet.privateKey,
      balance: '0',
      createdAt: new Date().toISOString(),
    };

    await this.redisService.set(
      `wallet:${wallet.address}`,
      JSON.stringify(wallet),
    );

    return wallet;
  }

  async importWallet(privateKey: string): Promise<Wallet> {
    const ethWallet =
      this.blockchainService.getWalletFromPrivateKey(privateKey);

    const balance = await this.blockchainService.getBalance(ethWallet.address);

    const wallet: Wallet = {
      address: ethWallet.address,
      privateKey: ethWallet.privateKey,
      balance: balance.toString(),
      createdAt: new Date().toISOString(),
    };

    await this.redisService.set(
      `wallet:${wallet.address}`,
      JSON.stringify(wallet),
    );

    return wallet;
  }

  async getWallet(address: string): Promise<Wallet> {
    const data = await this.redisService.get(`wallet:${address}`);
    if (!data) {
      throw new NotFoundException(`Wallet ${address} not found`);
    }
    return JSON.parse(data) as Wallet;
  }

  async getBalance(address: string): Promise<WalletBalance> {
    const balance = await this.blockchainService.getBalance(address);
    const balanceInEth = this.blockchainService.formatEther(balance);

    return {
      address,
      balance: balance.toString(),
      balanceInEth,
    };
  }

  async addTransaction(address: string, transactionId: string): Promise<void> {
    await this.redisService.lpush(`wallet:${address}:txs`, transactionId);
  }

  async getTransactions(address: string): Promise<string[]> {
    return this.redisService.lrange(`wallet:${address}:txs`, 0, -1);
  }

  async getPrivateKey(address: string): Promise<string> {
    const wallet = await this.getWallet(address);
    return wallet.privateKey;
  }
}
