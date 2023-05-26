import { ConfigManagerV2 } from '../../services/config-manager-v2';
import { AvailableNetworks } from '../../services/config-manager-types';

export namespace SafeModuleConfig {
  export interface ExchangeConfig {
    allowedSlippage: string;
    gasLimitEstimate: number;
    ttl: number;
    routerAddress: (network: string) => string;
    safeModuleAddress: string;
    tradingTypes: Array<string>;
    availableNetworks: Array<AvailableNetworks>;
  }

  export const config: ExchangeConfig = {
    allowedSlippage: ConfigManagerV2.getInstance().get(
      'gamut.allowedSlippage'
    ),
    gasLimitEstimate: ConfigManagerV2.getInstance().get(
      `gamut.gasLimitEstimate`
    ),
    ttl: ConfigManagerV2.getInstance().get('gamut.ttl'),
    routerAddress: (network: string) =>
      ConfigManagerV2.getInstance().get(
        'gamut.contractAddresses.' + network + '.routerAddress'
      ),
    tradingTypes: ['EVM_AMM'],
    safeModuleAddress: '0x8C424f9DCd5Cc75B4731bb959Dea4914CBAa6AAD',
    availableNetworks: [
      { chain: 'kava', networks: ['mainnet'] },
    ],
  };
}
