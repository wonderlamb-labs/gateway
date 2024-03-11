import ethers, {
  constants,
  Wallet,
  utils,
  BigNumber,
  Transaction,
} from 'ethers';
import { latency, bigNumberWithDecimalToStr } from '../../services/base';
import {
  HttpException,
  LOAD_WALLET_ERROR_CODE,
  LOAD_WALLET_ERROR_MESSAGE,
  TOKEN_NOT_SUPPORTED_ERROR_CODE,
  TOKEN_NOT_SUPPORTED_ERROR_MESSAGE,
} from '../../services/error-handler';
import { tokenValueToString } from '../../services/base';
import { TokenInfo } from './ethereum-base';
import { getConnector } from '../../services/connection-manager';

import {
  CustomTransactionReceipt,
  CustomTransaction,
  CustomTransactionResponse,
} from './ethereum.requests';
import {
  Ethereumish,
  UniswapLPish,
  Uniswapish,
  CLOBish,
} from '../../services/common-interfaces';
import {
  NonceRequest,
  NonceResponse,
  AllowancesRequest,
  AllowancesResponse,
  ApproveRequest,
  ApproveResponse,
  CancelRequest,
  CancelResponse,
} from '../../evm/evm.requests';
import {
  PollRequest,
  PollResponse,
  BalanceRequest,
  BalanceResponse,
  BalanceResponseWithCP,
} from '../../network/network.requests';
import { logger } from '../../services/logger';
import { SafeModule } from '../../connectors/safe-module/safe_module';
// import { SafeModule2 } from '../../connectors/safe-module2/safe_module2';

export async function nonce(
  ethereum: Ethereumish,
  req: NonceRequest
): Promise<NonceResponse> {
  // get the address via the public key since we generally use the public
  // key to interact with gateway and the address is not part of the user config
  const wallet = await ethereum.getWallet(req.address);
  const nonce = await ethereum.nonceManager.getNonce(wallet.address);
  return { nonce };
}

export async function nextNonce(
  ethereum: Ethereumish,
  req: NonceRequest
): Promise<NonceResponse> {
  // get the address via the public key since we generally use the public
  // key to interact with gateway and the address is not part of the user config
  const wallet = await ethereum.getWallet(req.address);
  const nonce = await ethereum.nonceManager.getNextNonce(wallet.address);
  return { nonce };
}

export const getTokenSymbolsToTokens = (
  ethereum: Ethereumish,
  tokenSymbols: Array<string>
): Record<string, TokenInfo> => {
  const tokens: Record<string, TokenInfo> = {};

  for (let i = 0; i < tokenSymbols.length; i++) {
    const symbol = tokenSymbols[i];
    const token = ethereum.getTokenBySymbol(symbol);
    if (token) tokens[symbol] = token;
  }

  return tokens;
};

export async function allowances(
  ethereumish: Ethereumish,
  req: AllowancesRequest
): Promise<AllowancesResponse | string> {
  const initTime = Date.now();
  const wallet = await ethereumish.getWallet(req.address);
  const capitalProviders = await ethereumish.getWalletCapitalProviders(
    req.address
  );
  const tokens = getTokenSymbolsToTokens(ethereumish, req.tokenSymbols);
  const spender = ethereumish.getSpender(req.spender);

  const approvals: Record<string, string> = {};
  await Promise.all(
    Object.keys(tokens).map(async (symbol) => {
      // instantiate a contract and pass in provider for read-only access
      const contract = ethereumish.getContract(
        tokens[symbol].address,
        ethereumish.provider
      );

      if (
        req.capitalProvider &&
        capitalProviders.includes(req.capitalProvider)
      ) {
        // let avatar;
        // if (req.network === 'bianance-smart-chain') {
        //   avatar = await SafeModule2.getInstance(
        //     req.chain,
        //     req.network
        //   ).getAvatar(req.capitalProvider, wallet);
        // } else {
        const avatar = await SafeModule.getInstance(
          req.chain,
          req.network
        ).getAvatar(req.capitalProvider, wallet);
        // }

        approvals[symbol] = tokenValueToString(
          await ethereumish.getERC20AllowanceAddr(
            contract,
            avatar,
            spender,
            tokens[symbol].decimals
          )
        );
      } else {
        approvals[symbol] = tokenValueToString(
          await ethereumish.getERC20Allowance(
            contract,
            wallet,
            spender,
            tokens[symbol].decimals
          )
        );
      }
    })
  );

  return {
    network: ethereumish.chain,
    timestamp: initTime,
    latency: latency(initTime, Date.now()),
    spender: spender,
    approvals: approvals,
  };
}

export async function balancesWithCP(
  ethereumish: Ethereumish,
  req: BalanceRequest
): Promise<BalanceResponseWithCP> {
  const initTime = Date.now();

  let wallet: Wallet;
  let capitalProviders: string[];
  const connector: CLOBish | undefined = req.connector
    ? ((await getConnector(req.chain, req.network, req.connector)) as CLOBish)
    : undefined;
  const balances: Record<string, Record<string, string>> = {};
  // let connectorBalances: { [key: string]: string } | undefined;

  if (!connector?.balances) {
    try {
      wallet = await ethereumish.getWallet(req.address);
      capitalProviders = await ethereumish.getWalletCapitalProviders(
        req.address
      );
    } catch (err) {
      throw new HttpException(
        500,
        LOAD_WALLET_ERROR_MESSAGE + err,
        LOAD_WALLET_ERROR_CODE
      );
    }
    console.log('ethereum.controller.ts capitalProviders', capitalProviders);

    const tokens = getTokenSymbolsToTokens(ethereumish, req.tokenSymbols);
    if (req.tokenSymbols.includes(ethereumish.nativeTokenSymbol)) {
      console.log('Requesting native token for ', wallet.address);
      let _tempBalances: Record<string, string> = {};
      let _tempBalance = await ethereumish.getNativeBalance(wallet);
      _tempBalances[wallet.address] = tokenValueToString(_tempBalance);
      balances[ethereumish.nativeTokenSymbol] = _tempBalances;
    }
    console.log(balances);
    console.log('ethereum.controller.ts balances', balances);
    await Promise.all(
      Object.keys(tokens).map(async (symbol) => {
        if (tokens[symbol] !== undefined) {
          const address = tokens[symbol].address;
          const decimals = tokens[symbol].decimals;
          // instantiate a contract and pass in provider for read-only access
          const contract = ethereumish.getContract(
            address,
            ethereumish.provider
          );
          const balance = await ethereumish.getERC20Balance(
            contract,
            wallet,
            decimals
          );
          let _tempBalances: Record<string, string> = {};
          _tempBalances[wallet.address] = tokenValueToString(balance);
          balances[symbol] = _tempBalances;
          for (let capitalProvider of capitalProviders) {
            const cpBalance = await ethereumish.getERC20BalanceAddr(
              contract,
              capitalProvider,
              decimals
            );
            _tempBalances[capitalProvider] = tokenValueToString(cpBalance);
            balances[symbol] = _tempBalances;
          }
        }
      })
    );
    console.log('ethereum.controller.ts balances', balances);

    if (!Object.keys(balances).length) {
      throw new HttpException(
        500,
        TOKEN_NOT_SUPPORTED_ERROR_MESSAGE,
        TOKEN_NOT_SUPPORTED_ERROR_CODE
      );
    }
  } else {
    // CLOB connector or any other connector that has the concept of separation of account has to implement a balance function
    // connectorBalances = await connector.balances(req);
    console.log('Executing ELSE here');
  }

  return {
    network: ethereumish.chain,
    timestamp: initTime,
    latency: latency(initTime, Date.now()),
    // balances: connectorBalances || balances,
    balances: balances,
  };
}

export async function balances(
  ethereumish: Ethereumish,
  req: BalanceRequest
): Promise<BalanceResponse | string> {
  const initTime = Date.now();

  let wallet: Wallet;
  let capitalProviders: string[];
  let balancesForAddress: string = '';
  const connector: CLOBish | undefined = req.connector
    ? ((await getConnector(req.chain, req.network, req.connector)) as CLOBish)
    : undefined;
  const balances: Record<string, string> = {};
  let connectorBalances: { [key: string]: string } | undefined;

  // let requestingCapitalProviderBalance = false;
  if (!connector?.balances) {
    try {
      wallet = await ethereumish.getWallet(req.address);
      capitalProviders = await ethereumish.getWalletCapitalProviders(
        req.address
      );
    } catch (err) {
      throw new HttpException(
        500,
        LOAD_WALLET_ERROR_MESSAGE + err,
        LOAD_WALLET_ERROR_CODE
      );
    }

    const tokens = getTokenSymbolsToTokens(ethereumish, req.tokenSymbols);

    if (req.capitalProvider && capitalProviders.includes(req.capitalProvider)) {
      balancesForAddress = await SafeModule.getInstance(
        req.chain,
        req.network
      ).getAvatar(req.capitalProvider, wallet);
      if (req.tokenSymbols.includes(ethereumish.nativeTokenSymbol)) {
        balances[ethereumish.nativeTokenSymbol] = tokenValueToString(
          await ethereumish.getNativeBalanceAddr(balancesForAddress)
        );
      }
      await Promise.all(
        Object.keys(tokens).map(async (symbol) => {
          if (tokens[symbol] !== undefined) {
            const address = tokens[symbol].address;
            const decimals = tokens[symbol].decimals;
            // instantiate a contract and pass in provider for read-only access
            const contract = ethereumish.getContract(
              address,
              ethereumish.provider
            );
            const balance = await ethereumish.getERC20BalanceAddr(
              contract,
              balancesForAddress,
              decimals
            );
            balances[symbol] = tokenValueToString(balance);
          }
        })
      );
    } else {
      balancesForAddress = wallet.address;
      if (req.tokenSymbols.includes(ethereumish.nativeTokenSymbol)) {
        balances[ethereumish.nativeTokenSymbol] = tokenValueToString(
          await ethereumish.getNativeBalance(wallet)
        );
      }
      await Promise.all(
        Object.keys(tokens).map(async (symbol) => {
          if (tokens[symbol] !== undefined) {
            const address = tokens[symbol].address;
            const decimals = tokens[symbol].decimals;
            // instantiate a contract and pass in provider for read-only access
            const contract = ethereumish.getContract(
              address,
              ethereumish.provider
            );
            const balance = await ethereumish.getERC20Balance(
              contract,
              wallet,
              decimals
            );
            balances[symbol] = tokenValueToString(balance);
          }
        })
      );
    }
    if (!Object.keys(balances).length) {
      throw new HttpException(
        500,
        TOKEN_NOT_SUPPORTED_ERROR_MESSAGE,
        TOKEN_NOT_SUPPORTED_ERROR_CODE
      );
    }
  } else {
    // CLOB connector or any other connector that has the concept of separation of account has to implement a balance function
    connectorBalances = await connector.balances(req);
  }

  return {
    network: ethereumish.chain,
    account: balancesForAddress,
    timestamp: initTime,
    latency: latency(initTime, Date.now()),
    balances: connectorBalances || balances,
  };
}

const toEthereumTransaction = (transaction: Transaction): CustomTransaction => {
  let maxFeePerGas = null;
  if (transaction.maxFeePerGas) {
    maxFeePerGas = transaction.maxFeePerGas.toString();
  }
  let maxPriorityFeePerGas = null;
  if (transaction.maxPriorityFeePerGas) {
    maxPriorityFeePerGas = transaction.maxPriorityFeePerGas.toString();
  }
  let gasLimit = null;
  if (transaction.gasLimit) {
    gasLimit = transaction.gasLimit.toString();
  }
  return {
    ...transaction,
    maxPriorityFeePerGas,
    maxFeePerGas,
    gasLimit,
    value: transaction.value.toString(),
  };
};

export async function approve(
  ethereumish: Ethereumish,
  req: ApproveRequest
): Promise<ApproveResponse | string> {
  const { amount, nonce, address, token, maxFeePerGas, maxPriorityFeePerGas } =
    req;

  const spender = ethereumish.getSpender(req.spender);
  const initTime = Date.now();
  let wallet: Wallet;
  try {
    wallet = await ethereumish.getWallet(address);
  } catch (err) {
    throw new HttpException(
      500,
      LOAD_WALLET_ERROR_MESSAGE + err,
      LOAD_WALLET_ERROR_CODE
    );
  }
  const fullToken = ethereumish.getTokenBySymbol(token);
  if (!fullToken) {
    throw new HttpException(
      500,
      TOKEN_NOT_SUPPORTED_ERROR_MESSAGE + token,
      TOKEN_NOT_SUPPORTED_ERROR_CODE
    );
  }
  const amountBigNumber = amount
    ? utils.parseUnits(amount, fullToken.decimals)
    : constants.MaxUint256;

  let maxFeePerGasBigNumber;
  if (maxFeePerGas) {
    maxFeePerGasBigNumber = BigNumber.from(maxFeePerGas);
  }
  let maxPriorityFeePerGasBigNumber;
  if (maxPriorityFeePerGas) {
    maxPriorityFeePerGasBigNumber = BigNumber.from(maxPriorityFeePerGas);
  }
  // instantiate a contract and pass in wallet, which act on behalf of that signer
  const contract = ethereumish.getContract(fullToken.address, wallet);

  // convert strings to BigNumber
  // call approve function
  const approval = await ethereumish.approveERC20(
    contract,
    wallet,
    spender,
    amountBigNumber,
    nonce,
    maxFeePerGasBigNumber,
    maxPriorityFeePerGasBigNumber,
    ethereumish.gasPrice
  );

  if (approval.hash) {
    await ethereumish.txStorage.saveTx(
      ethereumish.chain,
      ethereumish.chainId,
      approval.hash,
      new Date(),
      ethereumish.gasPrice
    );
  }

  return {
    network: ethereumish.chain,
    timestamp: initTime,
    latency: latency(initTime, Date.now()),
    tokenAddress: fullToken.address,
    spender: spender,
    amount: bigNumberWithDecimalToStr(amountBigNumber, fullToken.decimals),
    nonce: approval.nonce,
    approval: toEthereumTransaction(approval),
  };
}

// TransactionReceipt from ethers uses BigNumber which is not easy to interpret directly from JSON.
// Transform those BigNumbers to string and pass the rest of the data without changes.

const toEthereumTransactionReceipt = (
  receipt: ethers.providers.TransactionReceipt | null
): CustomTransactionReceipt | null => {
  if (receipt) {
    let effectiveGasPrice = null;
    if (receipt.effectiveGasPrice) {
      effectiveGasPrice = receipt.effectiveGasPrice.toString();
    }
    return {
      ...receipt,
      gasUsed: receipt.gasUsed.toString(),
      cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
      effectiveGasPrice,
    };
  }

  return null;
};

const toEthereumTransactionResponse = (
  response: ethers.providers.TransactionResponse | null
): CustomTransactionResponse | null => {
  if (response) {
    let gasPrice = null;
    if (response.gasPrice) {
      gasPrice = response.gasPrice.toString();
    }
    return {
      ...response,
      gasPrice,
      gasLimit: response.gasLimit.toString(),
      value: response.value.toString(),
    };
  }

  return null;
};

export function willTxSucceed(
  txDuration: number,
  txDurationLimit: number,
  txGasPrice: number,
  currentGasPrice: number
): boolean {
  if (txDuration > txDurationLimit && currentGasPrice > txGasPrice) {
    return false;
  }
  return true;
}

// txStatus
// -1: not in the mempool or failed
// 1: succeeded
// 2: in the mempool and likely to succeed
// 3: in the mempool and likely to fail
// 0: in the mempool but we dont have data to guess its status
export async function poll(
  ethereumish: Ethereumish,
  req: PollRequest
): Promise<PollResponse> {
  const initTime = Date.now();
  const currentBlock = await ethereumish.getCurrentBlockNumber();
  const txData = await ethereumish.getTransaction(req.txHash);
  let txBlock, txReceipt, txStatus;
  if (!txData) {
    // tx not found, didn't reach the mempool or it never existed
    txBlock = -1;
    txReceipt = null;
    txStatus = -1;
  } else {
    txReceipt = await ethereumish.getTransactionReceipt(req.txHash);
    if (txReceipt === null) {
      // tx is in the mempool
      txBlock = -1;
      txReceipt = null;
      txStatus = 0;

      const transactions = await ethereumish.txStorage.getTxs(
        ethereumish.chain,
        ethereumish.chainId
      );

      if (transactions[txData.hash]) {
        const data: [Date, number] = transactions[txData.hash];
        const now = new Date();
        const txDuration = Math.abs(now.getTime() - data[0].getTime());
        if (
          willTxSucceed(txDuration, 60000 * 3, data[1], ethereumish.gasPrice)
        ) {
          txStatus = 2;
        } else {
          txStatus = 3;
        }
      }
    } else {
      // tx has been processed
      txBlock = txReceipt.blockNumber;
      txStatus = typeof txReceipt.status === 'number' ? 1 : -1;

      // decode logs
      if (req.connector) {
        try {
          const connector: Uniswapish | UniswapLPish | CLOBish =
            await getConnector<Uniswapish | UniswapLPish | CLOBish>(
              req.chain,
              req.network,
              req.connector
            );

          txReceipt.logs = connector.abiDecoder?.decodeLogs(txReceipt.logs);
        } catch (e) {
          logger.error(e);
        }
      }
    }
  }

  logger.info(
    `Poll ${ethereumish.chain}, txHash ${req.txHash}, status ${txStatus}.`
  );
  return {
    network: ethereumish.chain,
    currentBlock,
    timestamp: initTime,
    txHash: req.txHash,
    txBlock,
    txStatus,
    txData: toEthereumTransactionResponse(txData),
    txReceipt: toEthereumTransactionReceipt(txReceipt),
  };
}

export async function cancel(
  ethereumish: Ethereumish,
  req: CancelRequest
): Promise<CancelResponse> {
  const initTime = Date.now();
  let wallet: Wallet;
  try {
    wallet = await ethereumish.getWallet(req.address);
  } catch (err) {
    throw new HttpException(
      500,
      LOAD_WALLET_ERROR_MESSAGE + err,
      LOAD_WALLET_ERROR_CODE
    );
  }

  // call cancelTx function
  const cancelTx = await ethereumish.cancelTx(wallet, req.nonce);

  logger.info(
    `Cancelled transaction at nonce ${req.nonce}, cancel txHash ${cancelTx.hash}.`
  );

  return {
    network: ethereumish.chain,
    timestamp: initTime,
    latency: latency(initTime, Date.now()),
    txHash: cancelTx.hash,
  };
}
