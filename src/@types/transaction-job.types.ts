export interface TransactionJobData {
  transactionId: string;
  transactionHash: string;
  from: string;
  to: string;
  amount: string;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  error?: string; // Add this field
}

export interface TransactionResponse {
  id: string;
  from: string;
  to: string;
  amount: string;
  amountInEth: string;
  blockNumber?: number;
  transactionHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

export interface ExternalTransaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: string;
  status: 'confirmed';
  gasUsed: string;
  effectiveGasPrice: string;
  source: 'external';
}
