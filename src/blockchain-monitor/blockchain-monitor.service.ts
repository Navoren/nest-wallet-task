/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionResponse } from 'ethers';
import { ExternalTransaction } from 'src/@types/transaction-job.types';
import { BlockchainService } from 'src/blockchain/blockchain.service';
import { RedisService } from 'src/helpers/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BlockchainMonitorService {
  private readonly logger = new Logger(BlockchainMonitorService.name);
  private lastScannedBlock: number = 0;
  private isScanning: boolean = false;

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly redisService: RedisService,
  ) {
    this.initializeLastScannedBlock();
  }

  private async initializeLastScannedBlock() {
    try {
      const storedBlock = await this.redisService.get(
        'monitor:lastScannedBlock',
      );
      if (storedBlock) {
        this.lastScannedBlock = parseInt(storedBlock);
      } else {
        const currentBlock = await this.blockchainService
          .getProvider()
          .getBlockNumber();
        this.lastScannedBlock = currentBlock;
        await this.redisService.set(
          'monitor:lastScannedBlock',
          currentBlock.toString(),
        );
      }
      this.logger.log(
        `Starting blockchain monitoring from block ${this.lastScannedBlock}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize last scanned block: ${error.message as string}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async scanNewBlocks() {
    if (this.isScanning) {
      this.logger.debug('Previous scan still in progress, skipping this cycle');
      return;
    }

    this.isScanning = true;
    try {
      const currentBlock = await this.blockchainService
        .getProvider()
        .getBlockNumber();
      if (currentBlock <= this.lastScannedBlock) {
        this.isScanning = false;
        return;
      }

      this.logger.log(
        `Scanning blocks from ${this.lastScannedBlock + 1} to ${currentBlock}`,
      );

      const walletKeys = await this.redisService.keys('wallet:*');
      const monitoredAddresses = new Set<string>();

      for (const key of walletKeys) {
        if (key.includes(':txs')) continue;
        const walletData = await this.redisService.get(key);
        if (walletData) {
          const wallet = JSON.parse(walletData);
          monitoredAddresses.add(wallet.address.toLowerCase());
        }
      }

      if (monitoredAddresses.size === 0) {
        this.logger.log('No monitored wallets found, skipping block scan');
        this.lastScannedBlock = currentBlock;
        await this.redisService.set(
          'monitor:lastScannedBlock',
          currentBlock.toString(),
        );
        this.isScanning = false;
        return;
      }

      this.logger.log(`Monitoring ${monitoredAddresses.size} wallet addresses`);

      const batchSize = 10;
      for (
        let i = this.lastScannedBlock + 1;
        i <= currentBlock;
        i += batchSize
      ) {
        const endBlock = Math.min(i + batchSize - 1, currentBlock);
        await this.scanBlockRange(i, endBlock, monitoredAddresses);
      }

      this.lastScannedBlock = currentBlock;
      await this.redisService.set(
        'monitor:lastScannedBlock',
        currentBlock.toString(),
      );

      this.logger.log(`Scan complete up to block ${currentBlock}`);
    } catch (error) {
      this.logger.error('Error during block scan:', error);
    } finally {
      this.isScanning = false;
    }
  }

  private async scanBlockRange(
    startBlock: number,
    endBlock: number,
    monitoredAddresses: Set<string>,
  ) {
    const provider = this.blockchainService.getProvider();

    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
      try {
        const block = await provider.getBlock(blockNumber);

        if (!block || !block.transactions) continue;

        for (const txHash of block.transactions) {
          try {
            const tx = await provider.getTransaction(txHash);
            if (!tx) continue;

            const fromAddress = tx.from?.toLowerCase();
            const toAddress = tx.to?.toLowerCase();

            const isRelevant =
              (fromAddress && monitoredAddresses.has(fromAddress)) ||
              (toAddress && monitoredAddresses.has(toAddress));

            if (isRelevant && tx.hash) {
              await this.processExternalTransaction(
                tx,
                blockNumber,
                monitoredAddresses,
              );
            }
          } catch (error) {
            this.logger.error(
              `Error fetching transaction ${txHash} in block ${blockNumber}`,
              error,
            );
          }
        }
      } catch (error) {
        this.logger.error(`Error scanning block ${blockNumber}`, error);
      }
    }
  }

  private async processExternalTransaction(
    tx: TransactionResponse,
    blockNumber: number,
    monitoredAddresses: Set<string>,
  ) {
    try {
      const txHash = tx.hash;

      // Check if we already have this transaction
      const existingTxKeys = await this.redisService.keys('transaction:*');
      for (const key of existingTxKeys) {
        const txData = await this.redisService.get(key);
        if (txData) {
          const existingTx = JSON.parse(txData);
          if (existingTx.transactionHash === txHash) {
            this.logger.debug(`Transaction ${txHash} already tracked`);
            return;
          }
        }
      }

      // Get transaction receipt for gas information
      const receipt =
        await this.blockchainService.getTransactionReceipt(txHash);
      if (!receipt) return;

      const fromAddress = tx.from.toLowerCase();
      const toAddress = tx.to?.toLowerCase() || '';

      // Create external transaction record
      const externalTx: ExternalTransaction = {
        id: uuidv4(),
        from: tx.from,
        to: tx.to || '',
        amount: tx.value.toString(),
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.hash,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.gasPrice?.toString() || '',
        source: 'external',
      };

      // Store transaction
      await this.redisService.set(
        `transaction:${externalTx.id}`,
        JSON.stringify(externalTx),
      );

      // Add to wallet transaction lists
      if (monitoredAddresses.has(fromAddress)) {
        await this.redisService.lpush(`wallet:${tx.from}:txs`, externalTx.id);
        this.logger.log(
          `📤 External SEND detected: ${tx.from} sent ${this.blockchainService.formatEther(tx.value)} ETH`,
        );
      }

      if (toAddress && monitoredAddresses.has(toAddress)) {
        await this.redisService.lpush(`wallet:${tx.to}:txs`, externalTx.id);
        this.logger.log(
          `📥 External RECEIVE detected: ${tx.to} received ${this.blockchainService.formatEther(tx.value)} ETH`,
        );
      }

      this.logger.log(
        `✅ Tracked external transaction: ${txHash.substring(0, 10)}...`,
      );
    } catch (error) {
      this.logger.error(`Error processing transaction ${tx.hash}`, error);
    }
  }

  async triggerScan() {
    this.logger.log('🔄 Manual scan triggered');
    await this.scanNewBlocks();
  }

  async getMonitoringStatus() {
    const currentBlock = await this.blockchainService
      .getProvider()
      .getBlockNumber();
    const walletKeys = await this.redisService.keys('wallet:*');
    const monitoredWallets = walletKeys.filter(
      (key) => !key.includes(':txs'),
    ).length;

    return {
      isActive: !this.isScanning,
      lastScannedBlock: this.lastScannedBlock,
      currentBlock: currentBlock,
      blocksBehind: currentBlock - this.lastScannedBlock,
      monitoredWallets: monitoredWallets,
      nextScanIn: '5 seconds',
    };
  }
}
