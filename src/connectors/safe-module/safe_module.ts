import {
  Contract,
  // Contract,
  ContractInterface,
  Wallet,
  // ContractTransaction,
  // Transaction,
} from 'ethers';
import safeModuleAbi from './safe_module_abi.json';
import { Kava } from '../../chains/kava/kava';

export class SafeModule {
  private static _instances: { [name: string]: SafeModule };
  private kava: Kava;
  private _safeModuleAbi: ContractInterface;
  private _ready: boolean = false;

  private constructor(network: string) {
    this.kava = Kava.getInstance(network);
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
    capitalProvider: string,
    wallet: Wallet
  ): Promise<boolean> {
    const safeModuleContract = new Contract(
      capitalProvider,
      this._safeModuleAbi,
      wallet
    );
    console.log('Getting admin address of module', capitalProvider);
    const adminOfCapitalProvider: string = await safeModuleContract.admin();

    if (wallet.address === adminOfCapitalProvider) {
      return true;
    } else {
      return false;
    }
  }

  /**
   // TODO:: wallet is not necessary
   * Given a capitalProvider module and wallet, get the admin address.
   *
   * @param wallet Wallet of the trader
   * @param capitalProvider Address of the Capital Provider
   */
  async getAdmin(capitalProvider: string, wallet: Wallet): Promise<string> {
    const safeModuleContract = new Contract(
      capitalProvider,
      this._safeModuleAbi,
      wallet
    );
    const adminOfCapitalProvider: string = await safeModuleContract.admin();

    return adminOfCapitalProvider;
  }

  /**
   // TODO:: wallet is not necessary
   * Given a capitalProvider module and wallet, get the admin address.
   *
   * @param wallet Wallet of the trader
   * @param capitalProvider Address of the Capital Provider
   */
  async getAvatar(capitalProvider: string, wallet: Wallet): Promise<string> {
    const safeModuleContract = new Contract(
      capitalProvider,
      this._safeModuleAbi,
      wallet
    );
    const adminOfCapitalProvider: string = await safeModuleContract.avatar();

    return adminOfCapitalProvider;
  }
}
