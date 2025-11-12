/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Process,
  Processor,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import type { Job } from 'bull';
import { TransactionJobData } from '../../@types/transaction-job.types';
import { TransactionService } from '../transaction.service';
import { BlockchainService } from 'src/blockchain/blockchain.service';
import { Logger } from '@nestjs/common';

@Processor('transactions')
export class TransactionProcessor {
  private readonly logger = new Logger(TransactionProcessor.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly blockchainService: BlockchainService,
  ) {
    this.logger.log('TransactionProcessor initialized');
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onComplete(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed with error: ${error.message}`,
      error.stack,
    );
  }

  @Process('process-transaction')
  async handleTransactionConfirmation(job: Job<TransactionJobData>) {
    this.logger.log('=================================');
    this.logger.log(`PROCESSOR STARTED for job ${job.id}`);
    this.logger.log('=================================');

    const { transactionId, transactionHash, from, to, amount } = job.data;

    this.logger.log(`Transaction ID: ${transactionId}`);
    this.logger.log(`Transaction Hash: ${transactionHash}`);
    this.logger.log(
      `Transfer: ${this.blockchainService.formatEther(amount)} ETH from ${from} to ${to}`,
    );

    try {
      this.logger.log(`Calling waitForTransaction for ${transactionHash}`);

      // Wait for transaction to be mined
      const receipt =
        await this.blockchainService.waitForTransaction(transactionHash);

      this.logger.log(`waitForTransaction returned`);

      // Check if receipt is null (transaction was replaced/dropped)
      if (!receipt) {
        this.logger.error(`Transaction ${transactionId} returned null receipt`);
        const transaction =
          await this.transactionService.getTransaction(transactionId);
        transaction.status = 'failed';
        transaction.error = 'Transaction was replaced or dropped';
        await this.transactionService.updateTransaction(transaction);
        throw new Error('Transaction receipt is null');
      }

      this.logger.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      this.logger.log(`Gas used: ${receipt.gasUsed.toString()}`);
      this.logger.log(`Receipt status: ${receipt.status}`);
      this.logger.log(`Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);

      // Update transaction status in database
      this.logger.log(`Calling confirmTransaction for ${transactionId}`);
      await this.transactionService.confirmTransaction(
        transactionId,
        transactionHash,
      );

      // Verify the update
      const updatedTransaction =
        await this.transactionService.getTransaction(transactionId);
      this.logger.log(
        `Transaction ${transactionId} final status: ${updatedTransaction.status}`,
      );
      this.logger.log('=================================');
      this.logger.log(`PROCESSOR COMPLETED for job ${job.id}`);
      this.logger.log('=================================');
    } catch (error) {
      this.logger.error('=================================');
      this.logger.error(`PROCESSOR FAILED for job ${job.id}`);
      this.logger.error('=================================');
      this.logger.error(
        `Failed to confirm transaction ${transactionId}`,
        error.stack || error,
      );

      try {
        // Update transaction status to failed
        const transaction =
          await this.transactionService.getTransaction(transactionId);
        transaction.status = 'failed';
        transaction.error = error.message || 'Unknown error';
        await this.transactionService.updateTransaction(transaction);
      } catch (updateError) {
        this.logger.error(
          `Failed to update transaction status: ${updateError.message}`,
        );
      }

      throw error;
    }
  }
}
