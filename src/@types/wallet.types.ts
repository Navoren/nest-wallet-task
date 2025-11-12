export interface Wallet {
  address: string;
  balance: string;
  privateKey: string;
  createdAt: string;
}

export interface WalletResponse {
  address: string;
  balance: string;
  privateKey?: string;
}

export interface WalletBalance {
  address: string;
  balance: string;
  balanceInEth: string;
}
