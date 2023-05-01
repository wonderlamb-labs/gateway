import invariant from 'tiny-invariant'
import { validateAndParseAddress } from './utils'
import { CurrencyAmount, ETHER, Percent, Trade } from './entities'

/**
 * Options for producing the arguments to send call to the router.
 */
export interface TradeOptions {
  /**
   * How much the execution price is allowed to move unfavorably from the trade execution price.
   */
  allowedSlippage: Percent
  /**
   * How long the swap is valid until it expires, in seconds.
   * This will be used to produce a `deadline` parameter which is computed from when the swap call parameters
   * are generated.
   */
  ttl: number
  /**
   * The account that should receive the output of the swap.
   */
  recipient: string

  /**
   * Whether any of the tokens in the path are fee on transfer tokens, which should be handled with special methods
   */
  feeOnTransfer?: boolean
}

export interface TradeOptionsDeadline extends Omit<TradeOptions, 'ttl'> {
  /**
   * When the transaction expires.
   * This is an atlernate to specifying the ttl, for when you do not want to use local time.
   */
  deadline: number
}

/**
 * The parameters to use in the call to the Pancake Router to execute a trade.
 */
export interface SwapParameters {
  /**
   * The method to call on the Pancake Router.
   */
  methodName: string
  /**
   * The arguments to pass to the method, all hex encoded.
   */
  args: (string | string[])[]
  /**
   * The amount of wei to send in hex.
   */
  value: string
}

function toHex(currencyAmount: CurrencyAmount) {
  return `0x${currencyAmount.raw.toString(16)}`
}

const ZERO_HEX = '0x0'

/**
 * Represents the Pancake Router, and has static methods for helping execute trades.
 */
export abstract class Router {
  /**
   * Cannot be constructed.
   */
  private constructor() { }
  /**
   * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given trade.
   * @param trade to produce call parameters for
   * @param options options for the call parameters
   */
  public static swapCallParameters(trade: Trade, options: TradeOptions | TradeOptionsDeadline): SwapParameters {
    const etherIn = trade.inputAmount.currency === ETHER
    const etherOut = trade.outputAmount.currency === ETHER
    // the router does not support both ether in and out
    invariant(!(etherIn && etherOut), 'ETHER_IN_OUT')
    invariant(!('ttl' in options) || options.ttl > 0, 'TTL')

    const to: string = validateAndParseAddress(options.recipient)
    const amountIn: string = toHex(trade.maximumAmountIn(options.allowedSlippage))

    let methodName: string = ""
    let args: any = [""];
    let value: string = ZERO_HEX;
    const path: string[] = trade.route.path.map((token) => token.address)
    const deadlineSec =
      'ttl' in options
        ? `0x${(Math.floor(new Date().getTime() / 1000) + options.ttl).toString(16)}`
        : `0x${options.deadline.toString(16)}`
    const deadline = String(Number(deadlineSec) * 1000);
    const pathlen = path.length

    if (pathlen === 2) {
      methodName = "swap"
      args = [
        [path[0], path[1], amountIn],
        [to, to],
        ZERO_HEX,
        deadline
      ]
      value = ZERO_HEX;
    } else if (pathlen > 2) {
      methodName = "batchSwap"
      let swapsParam = [];

      for (let index = 0; index < pathlen; index++) {
        if (index == 0) {
          swapsParam.push([String(index), String(index + 1), amountIn])
        } else {
          swapsParam.push([String(index), String(index + 1), ZERO_HEX])
        }
      }
      args = [
        swapsParam,
        path,
        [to, to],
        new Array<string>(pathlen).fill(ZERO_HEX),
        deadline
      ]
      value = ZERO_HEX;
    } else {
      throw new Error(`Path of length ${pathlen} obtained`)
    }

    return {
      methodName,
      args,
      value,
    }
  }
}
