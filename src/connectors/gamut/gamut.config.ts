import { ConfigManagerV2 } from '../../services/config-manager-v2';
import { AvailableNetworks } from '../../services/config-manager-types';

export namespace GamutConfig {
  export interface ExchangeConfig {
    allowedSlippage: string;
    gasLimitEstimate: number;
    ttl: number;
    routerAddress: (network: string) => string;
    tradingTypes: Array<string>;
    availableNetworks: Array<AvailableNetworks>;
  }

  export const config: ExchangeConfig = {
    allowedSlippage: ConfigManagerV2.getInstance().get('gamut.allowedSlippage'),
    gasLimitEstimate: ConfigManagerV2.getInstance().get(
      `gamut.gasLimitEstimate`
    ),
    ttl: ConfigManagerV2.getInstance().get('gamut.ttl'),
    routerAddress: (network: string) =>
      ConfigManagerV2.getInstance().get(
        'gamut.contractAddresses.' + network + '.routerAddress'
      ),
    tradingTypes: ['EVM_AMM'],
    availableNetworks: [{ chain: 'kava', networks: ['mainnet'] }],
  };
}
