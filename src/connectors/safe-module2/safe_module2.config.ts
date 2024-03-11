import { ConfigManagerV2 } from '../../services/config-manager-v2';
import { AvailableNetworks } from '../../services/config-manager-types';

export namespace SafeModuleConfig2 {
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
      'safemodule2.allowedSlippage'
    ),
    gasLimitEstimate: ConfigManagerV2.getInstance().get(
      `safemodule2.gasLimitEstimate`
    ),
    ttl: ConfigManagerV2.getInstance().get('safemodule2.ttl'),
    routerAddress: (network: string) =>
      ConfigManagerV2.getInstance().get(
        'safemodule2.contractAddresses.' + network + '.routerAddress'
      ),
    tradingTypes: ['EVM_AMM'],
    safeModuleAddress: '0xA874F696E9d1AC19a34D9B265cc2100E514dE208', //'0x8C424f9DCd5Cc75B4731bb959Dea4914CBAa6AAD',
    availableNetworks: [
      { chain: 'binance-smart-chain', networks: ['mainnet'] },
    ],
  };
}
