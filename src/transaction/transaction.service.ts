/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { RedisService } from '../helpers/redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { BlockchainService } from 'src/blockchain/blockchain.service';
import { QueueService } from '../queue/queue.service';
import { Transaction } from '../@types/transaction-job.types';
import { v4 as uuidv4 } from 'uuid';
import { getBigInt } from 'ethers';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly walletService: WalletService,
    private readonly blockchainService: BlockchainService,
    private readonly queueService: QueueService,
  ) {}

  async createTransaction(
    fromAddress: string,
    toAddress: string,
    amount: string,
  ): Promise<Transaction> {
    await this.walletService.getWallet(fromAddress);

    if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
      throw new BadRequestException(
        'Cannot send transaction to the same address',
      );
    }

    const balanceData = await this.walletService.getBalance(fromAddress);
    const balance = getBigInt(balanceData.balance);
    const amountInWei = getBigInt(this.blockchainService.parseEther(amount));

    if (balance < amountInWei) {
      throw new BadRequestException(
        `Insufficient balance. Required: ${amount} ETH, Available: ${balanceData.balanceInEth} ETH`,
      );
    }

    const privateKey = await this.walletService.getPrivateKey(fromAddress);

    const transaction: Transaction = {
      id: uuidv4(),
      from: fromAddress,
      to: toAddress,
      amount: amountInWei.toString(),
      status: 'pending',
      timestamp: new Date().toISOString(),
    };

    await this.redisService.set(
      `transaction:${transaction.id}`,
      JSON.stringify(transaction),
    );
    this.logger.log(
      `Transaction ${transaction.id} created with status: pending`,
    );

    await this.walletService.addTransaction(fromAddress, transaction.id);
    await this.walletService.addTransaction(toAddress, transaction.id);

    try {
      const txResponse = await this.blockchainService.sendTransaction(
        privateKey,
        toAddress,
        amount,
      );

      transaction.transactionHash = txResponse.hash;
      await this.updateTransaction(transaction);
      this.logger.log(
        `Transaction ${transaction.id} sent with hash: ${txResponse.hash}`,
      );

      await this.queueService.addTransactionJob({
        transactionId: transaction.id,
        transactionHash: txResponse.hash,
        from: fromAddress,
        to: toAddress,
        amount: amountInWei.toString(),
      });

      return transaction;
    } catch (error) {
      transaction.status = 'failed';
      transaction.error = error.message;
      await this.updateTransaction(transaction);
      throw new BadRequestException(`Transaction failed: ${error.message}`);
    }
  }

  async getTransaction(id: string): Promise<Transaction> {
    const data = await this.redisService.get(`transaction:${id}`);
    if (!data) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return JSON.parse(data) as Transaction;
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    await this.redisService.set(
      `transaction:${transaction.id}`,
      JSON.stringify(transaction),
    );
    this.logger.log(
      `Transaction ${transaction.id} updated in Redis with status: ${transaction.status}`,
    );
  }

  async confirmTransaction(
    transactionId: string,
    transactionHash: string,
  ): Promise<void> {
    this.logger.log(`Confirming transaction ${transactionId}`);

    const transaction = await this.getTransaction(transactionId);
    this.logger.log(
      `Current status before confirmation: ${transaction.status}`,
    );

    const receipt =
      await this.blockchainService.getTransactionReceipt(transactionHash);

    if (!receipt) {
      this.logger.error(`Transaction receipt not found for ${transactionHash}`);
      throw new NotFoundException(
        'Transaction receipt not found on blockchain',
      );
    }

    transaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
    transaction.blockNumber = receipt.blockNumber;
    transaction.transactionHash = receipt.hash;
    transaction.gasUsed = receipt.gasUsed.toString();
    transaction.effectiveGasPrice = receipt.gasPrice?.toString() || '0';

    this.logger.log(
      `Setting transaction ${transactionId} status to: ${transaction.status}`,
    );
    await this.updateTransaction(transaction);

    // Verify the update worked
    const verified = await this.getTransaction(transactionId);
    this.logger.log(
      `Verified transaction ${transactionId} status in Redis: ${verified.status}`,
    );
  }
}
