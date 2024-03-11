import { Avalanche } from '../chains/avalanche/avalanche';
import { Cronos } from '../chains/cronos/cronos';
import { Ethereum } from '../chains/ethereum/ethereum';
import { BinanceSmartChain } from '../chains/binance-smart-chain/binance-smart-chain';
import { Harmony } from '../chains/harmony/harmony';
import { Polygon } from '../chains/polygon/polygon';
import { Kava } from '../chains/kava/kava';
import { Xdc } from '../chains/xdc/xdc';
import { MadMeerkat } from '../connectors/mad_meerkat/mad_meerkat';
import { Gamut } from '../connectors/gamut/gamut';
// import { DexOpenOcean } from '../connectors/dexopenocean/dexOpenOcean';
import { Newopenocean } from '../connectors/newopenocean/newOpenOcean';
import { Openocean } from '../connectors/openocean/openocean';
import { Pangolin } from '../connectors/pangolin/pangolin';
import { Perp } from '../connectors/perp/perp';
import { Quickswap } from '../connectors/quickswap/quickswap';
import { PancakeSwap } from '../connectors/pancakeswap/pancakeswap';
import { Uniswap } from '../connectors/uniswap/uniswap';
import { UniswapLP } from '../connectors/uniswap/uniswap.lp';
import { VVSConnector } from '../connectors/vvs/vvs';
import { InjectiveCLOB } from '../connectors/injective/injective';
import { InjectiveClobPerp } from '../connectors/injective_perpetual/injective.perp';
import { Injective } from '../chains/injective/injective';
import { ZigZag } from '../connectors/zigzag/zigzag';
import {
  CLOBish,
  Ethereumish,
  Nearish,
  Perpish,
  RefAMMish,
  Uniswapish,
  UniswapLPish,
  Xdcish,
} from './common-interfaces';
import { Traderjoe } from '../connectors/traderjoe/traderjoe';
import { Sushiswap } from '../connectors/sushiswap/sushiswap';
import { Defikingdoms } from '../connectors/defikingdoms/defikingdoms';
import { Defira } from '../connectors/defira/defira';
import { Near } from '../chains/near/near';
import { Ref } from '../connectors/ref/ref';
import { Xsswap } from '../connectors/xsswap/xsswap';
import { DexalotCLOB } from '../connectors/dexalot/dexalot';
// import { logger } from './logger';

export type ChainUnion = Ethereumish | Nearish | Injective | Xdcish;

export type Chain<T> = T extends Ethereumish
  ? Ethereumish
  : T extends Nearish
  ? Nearish
  : T extends Xdcish
  ? Xdcish
  : T extends Injective
  ? Injective
  : never;

export async function getChain<T>(
  chain: string,
  network: string
): Promise<Chain<T>> {
  let chainInstance: ChainUnion;

  if (chain === 'ethereum') chainInstance = Ethereum.getInstance(network);
  else if (chain === 'avalanche')
    chainInstance = Avalanche.getInstance(network);
  else if (chain === 'polygon') chainInstance = Polygon.getInstance(network);
  else if (chain === 'kava') chainInstance = Kava.getInstance(network);
  else if (chain === 'xdc') chainInstance = Xdc.getInstance(network);
  else if (chain === 'harmony') chainInstance = Harmony.getInstance(network);
  else if (chain === 'near') chainInstance = Near.getInstance(network);
  else if (chain === 'binance-smart-chain')
    chainInstance = BinanceSmartChain.getInstance(network);
  else if (chain === 'cronos') chainInstance = Cronos.getInstance(network);
  else if (chain === 'injective')
    chainInstance = Injective.getInstance(network);
  else throw new Error('unsupported chain');

  if (!chainInstance.ready()) {
    await chainInstance.init();
  }

  return chainInstance as Chain<T>;
}

export type ConnectorUnion =
  | Uniswapish
  | UniswapLPish
  | Perpish
  | RefAMMish
  | CLOBish
  | ZigZag
  | InjectiveClobPerp;

export type Connector<T> = T extends Uniswapish
  ? Uniswapish
  : T extends UniswapLPish
  ? UniswapLPish
  : T extends Perpish
  ? Perpish
  : T extends RefAMMish
  ? RefAMMish
  : T extends CLOBish
  ? CLOBish
  : T extends ZigZag
  ? ZigZag
  : T extends InjectiveClobPerp
  ? InjectiveClobPerp
  : never;

export async function getConnector<T>(
  chain: string,
  network: string,
  connector: string | undefined,
  address?: string
): Promise<Connector<T>> {
  let connectorInstance: ConnectorUnion;

  // else if (chain === 'binance-smart-chain' && connector === 'dexopenocean') {
  //   connectorInstance = DexOpenOcean.getInstance(chain, network);
  // }

  if (
    (chain === 'ethereum' || chain === 'polygon') &&
    connector === 'uniswap'
  ) {
    connectorInstance = Uniswap.getInstance(chain, network);
  } else if (chain === 'polygon' && connector === 'quickswap') {
    connectorInstance = Quickswap.getInstance(chain, network);
  } else if (
    (chain === 'ethereum' || chain === 'polygon') &&
    connector === 'uniswapLP'
  ) {
    connectorInstance = UniswapLP.getInstance(chain, network);
  } else if (chain === 'binance-smart-chain' && connector === 'newopenocean') {
    connectorInstance = Newopenocean.getInstance(chain, network);
  } else if (chain === 'kava' && connector === 'gamut') {
    connectorInstance = Gamut.getInstance(chain, network);
  } else if (chain === 'ethereum' && connector === 'perp') {
    connectorInstance = Perp.getInstance(chain, network, address);
  } else if (chain === 'avalanche' && connector === 'pangolin') {
    connectorInstance = Pangolin.getInstance(chain, network);
  } else if (connector === 'openocean') {
    connectorInstance = Openocean.getInstance(chain, network);
  } else if (chain === 'avalanche' && connector === 'traderjoe') {
    connectorInstance = Traderjoe.getInstance(chain, network);
  } else if (chain === 'harmony' && connector === 'defikingdoms') {
    connectorInstance = Defikingdoms.getInstance(chain, network);
  } else if (chain === 'harmony' && connector === 'defira') {
    connectorInstance = Defira.getInstance(chain, network);
  } else if (chain === 'cronos' && connector === 'mad_meerkat') {
    connectorInstance = MadMeerkat.getInstance(chain, network);
  } else if (chain === 'cronos' && connector === 'vvs') {
    connectorInstance = VVSConnector.getInstance(chain, network);
  } else if (chain === 'near' && connector === 'ref') {
    connectorInstance = Ref.getInstance(chain, network);
  } else if (chain === 'binance-smart-chain' && connector === 'pancakeswap') {
    connectorInstance = PancakeSwap.getInstance(chain, network);
  } else if (connector === 'sushiswap') {
    connectorInstance = Sushiswap.getInstance(chain, network);
  } else if (chain === 'injective' && connector === 'injective_perpetual') {
    connectorInstance = InjectiveClobPerp.getInstance(chain, network);
  } else if (chain === 'xdc' && connector === 'xsswap') {
    connectorInstance = Xsswap.getInstance(chain, network);
  } else if (chain === 'injective' && connector === 'injective') {
    connectorInstance = InjectiveCLOB.getInstance(chain, network);
  } else if (chain === 'avalanche' && connector === 'dexalot') {
    connectorInstance = DexalotCLOB.getInstance(network);
  } else if (chain === 'ethereum' && connector === 'zigzag') {
    connectorInstance = ZigZag.getInstance(network);
  } else {
    throw new Error('unsupported chain or connector');
  }

  if (!connectorInstance.ready()) {
    await connectorInstance.init();
  }

  return connectorInstance as Connector<T>;
}
