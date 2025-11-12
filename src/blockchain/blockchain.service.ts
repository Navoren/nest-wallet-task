import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly provider: ethers.JsonRpcProvider;

  constructor() {
    const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.logger.log(`Connected to Sepolia network: ${rpcUrl}`);
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  createWallet(): ethers.HDNodeWallet {
    const wallet = ethers.Wallet.createRandom();
    return wallet.connect(this.provider);
  }

  getWalletFromPrivateKey(privateKey: string): ethers.Wallet {
    return new ethers.Wallet(privateKey, this.provider);
  }

  async getBalance(address: string): Promise<ethers.BigNumberish> {
    const balance = await this.provider.getBalance(address);
    return balance;
  }

  async sendTransaction(
    fromPrivateKey: string,
    to: string,
    amountInEth: string,
  ): Promise<ethers.TransactionResponse> {
    const wallet = this.getWalletFromPrivateKey(fromPrivateKey);

    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(amountInEth),
    });

    this.logger.log(`Transaction sent: ${tx.hash}`);
    return tx;
  }

  async waitForTransaction(txHash: string): Promise<ethers.TransactionReceipt> {
    this.logger.log(`Waiting for transaction confirmation: ${txHash}`);
    const tx = await this.provider.waitForTransaction(txHash);
    return tx as ethers.TransactionReceipt;
  }

  async getTransactionReceipt(
    txHash: string,
  ): Promise<ethers.TransactionReceipt | null> {
    const txReceipt = await this.provider.getTransactionReceipt(txHash);
    return txReceipt;
  }

  formatEther(value: ethers.BigNumberish): string {
    return ethers.formatEther(value);
  }

  parseEther(value: string): ethers.BigNumberish {
    return ethers.parseEther(value);
  }
}
