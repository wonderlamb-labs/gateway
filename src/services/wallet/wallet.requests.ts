export interface AddWalletRequest {
  chain: string;
  network: string;
  privateKey: string;
  capitalProviders?: string[];
  address?: string;
  accountId?: number;
}

export interface AddWalletResponse {
  address: string;
  capitalProviders?: string[];
}

export interface WalletSignResponse {
  signature: string;
}

export interface RemoveWalletRequest {
  chain: string;
  address: string;
}

export interface WalletSignRequest extends RemoveWalletRequest {
  network: string;
  message: string;
}

export interface GetWalletResponse {
  chain: string;
  walletAddresses: string[];
  capitalProviders: string[][];
}
