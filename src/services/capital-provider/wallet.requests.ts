export interface AddWalletWithCapitalProviderRequest {
  chain: string;
  network: string;
  privateKey: string;
  capitalProviderAddress: string;
  address?: string;
  accountId?: number;
}

export interface RemoveWalletRequest {
  chain: string;
  network: string;
  address: string;
}

export interface AddWalletWithCapitalProviderResponse {
  address: string;
  capitalProviderAddress: string;
}

export interface GetWalletWithCapitalProviderResponse {
  chain: string;
  walletAddresses: string[];
  capitalProviderAddresses: string[];
}
