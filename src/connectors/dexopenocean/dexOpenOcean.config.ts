import { ConfigManagerV2 } from '../../services/config-manager-v2';
import { AvailableNetworks } from '../../services/config-manager-types';

export namespace DexOpenOceanConfig {
  export interface ExchangeConfig {
    allowedSlippage: string;
    gasLimitEstimate: number;
    ttl: number;
    capitalProvider: string;
    routerAddress: (network: string) => string;
    tradingTypes: Array<string>;
    availableNetworks: Array<AvailableNetworks>;
  }

  export const config: ExchangeConfig = {
    allowedSlippage: ConfigManagerV2.getInstance().get(
      'dexOpenOcean.allowedSlippage'
    ),
    gasLimitEstimate: ConfigManagerV2.getInstance().get(
      `dexOpenOcean.gasLimitEstimate`
    ),
    capitalProvider: ConfigManagerV2.getInstance().get(
      `dexOpenOcean.capitalProvider`
    ),
    ttl: ConfigManagerV2.getInstance().get('dexOpenOcean.ttl'),
    routerAddress: (network: string) =>
      ConfigManagerV2.getInstance().get(
        'dexOpenOcean.contractAddresses.' + network + '.routerAddress'
      ),
    tradingTypes: ['EVM_AMM'],
    availableNetworks: [
      { chain: 'binance-smart-chain', networks: ['mainnet'] },
    ],
  };
}
