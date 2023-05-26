import {
  // Contract,
  ContractInterface,
  // ContractTransaction,
  // Transaction,
} from 'ethers';
import { SafeModuleConfig } from './safe_module.config';
import safeModuleAbi from './safe_module_abi.json';
import { Kava } from '../../chains/kava/kava';

export class SafeModule {
  private static _instances: { [name: string]: SafeModule };
  private kava: Kava;
  private _safeModule: string;
  private _safeModuleAbi: ContractInterface;
  private _ready: boolean = false;

  private constructor(network: string) {
    const config = SafeModuleConfig.config;
    this.kava = Kava.getInstance(network);
    this._safeModule = config.safeModuleAddress;
    this._safeModuleAbi = safeModuleAbi;
  }

  public static getInstance(chain: string, network: string): SafeModule {
    if (SafeModule._instances === undefined) {
      SafeModule._instances = {};
    }
    if (!(chain + network in SafeModule._instances)) {
      SafeModule._instances[chain + network] = new SafeModule(network);
    }

    return SafeModule._instances[chain + network];
  }

  public async init() {
    if (!this.kava.ready()) {
      await this.kava.init();
    }
    this._ready = true;
  }

  public ready(): boolean {
    return this._ready;
  }

  /**
   * Safe Module address.
   */
  public get safeModule(): string {
    return this._safeModule;
  }

  /**
   * Router smart contract ABI.
   */
  public get safeModuleAbi(): ContractInterface {
    return this._safeModuleAbi;
  }

  /**
   * Given a wallet and capitalProvider, check if wallet is allowed to use funds of capital provider .
   *
   * @param wallet Address of the trader
   * @param capitalProvider Address of the Capital Provider
   */
  async isWalletAllowedForCapitalProvider(
    admin: string,
    capitalProvider: string,
  ): Promise<boolean> {

    // const safeModuleContract = new Contract(this._safeModule, this._safeModuleAbi, wallet);
    console.log(admin, capitalProvider)

    return true;

  }

}
