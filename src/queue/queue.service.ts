/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { TransactionJobData } from '../@types/transaction-job.types';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('transactions') private readonly transactionQueue: Queue,
  ) {}

  async addTransactionJob(data: TransactionJobData): Promise<void> {
    this.logger.log(`Adding transaction job to queue: ${data.transactionId}`);
    this.logger.log(`Queue name: ${this.transactionQueue.name}`);

    try {
      const job = await this.transactionQueue.add('process-transaction', data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: false, // Keep completed jobs for debugging
        removeOnFail: false, // Keep failed jobs for debugging
      });

      this.logger.log(`Job added successfully with ID: ${job.id}`);
      this.logger.log(`Job data: ${JSON.stringify(job.data)}`);

      // Check job status immediately
      const state = await job.getState();
      this.logger.log(`Job ${job.id} initial state: ${state}`);
    } catch (error) {
      this.logger.error(
        `Failed to add job to queue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<string> {
    const job = await this.transactionQueue.getJob(jobId);
    if (!job) {
      return 'not_found';
    }
    return await job.getState();
  }

  async getQueueStats() {
    const waiting = await this.transactionQueue.getWaitingCount();
    const active = await this.transactionQueue.getActiveCount();
    const completed = await this.transactionQueue.getCompletedCount();
    const failed = await this.transactionQueue.getFailedCount();
    const delayed = await this.transactionQueue.getDelayedCount();

    this.logger.log(
      `Queue Stats - Waiting: ${waiting}, Active: ${active}, Completed: ${completed}, Failed: ${failed}, Delayed: ${delayed}`,
    );

    return { waiting, active, completed, failed, delayed };
  }
}
