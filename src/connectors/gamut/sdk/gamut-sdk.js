import Web3 from "web3";
import { ethers } from "ethers";
import erc20ABI from "./abi/erc20";
import hedgeFactoryABI from "./abi/hedgeFactory";
import poolABI from "./abi/pool";
import routerABI from "./abi/router";
import faucetABI from "./abi/faucet";
import { chainIds, contractAddresses } from "./constants";
import { getInitialPoolData } from "./seedData.js";
import axios from "axios";

// web3 integration part
export const getTokenBalance = async (provider, tokenAddr, account) => {
    const abi = erc20ABI[0];
    let web3 = new Web3(provider);
    if (tokenAddr === "0x0000000000000000000000000000000000000000") {
        const coinbal = await web3.eth.getBalance(account);
        let result = Number(coinbal / 10 ** 18);
        if (Number(result) > 999)
            result = result.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return result;
    } else {
        let contract = new web3.eth.Contract(abi, tokenAddr);
        let bal = await contract.methods["balanceOf"](account).call();
        let decimal = await contract.methods["decimals"]().call();
        let result = Number(bal / 10 ** decimal);
        if (Number(result) > 999)
            result = result.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return result;
    }
};

export const getPoolAddress = async (
    provider,
    token1Addr,
    token2Addr,
    contractAddr=contractAddresses.kava.hedgeFactory
) => {
    const abi = hedgeFactoryABI[0];
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(abi, contractAddr);
    let result = await contract.methods["getPool"](token1Addr, token2Addr).call();
    return result;
};

export const getPoolData = async (provider, poolAddress) => {
    const abi = poolABI[0];
    const tokenAbi = erc20ABI[0];
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(abi, poolAddress);
    let result1 = await contract.methods["getPoolTokensAndBalances"]().call();
    let result2 = await contract.methods["getWeights"]().call();
    let tokenContract1 = new web3.eth.Contract(tokenAbi, result1["tokens"][0]);
    let tokenContract2 = new web3.eth.Contract(tokenAbi, result1["tokens"][1]);
    let decimal1 = await tokenContract1.methods["decimals"]().call();
    let decimal2 = await tokenContract2.methods["decimals"]().call();
    let result = {
        balances: result1["balances"],
        tokens: result1["tokens"],
        weights: result2,
        decimals: [decimal1, decimal2]
    };
    return result;
};

export const tokenApproval = async (account, provider, tokenAddr, contractAddr) => {
    const tokenAbi = erc20ABI[0];
    let web3 = new Web3(provider);
    let tokenContract = new web3.eth.Contract(tokenAbi, tokenAddr);
    // const owner = await contract.methods['owner']().call();
    let remain = await tokenContract.methods["allowance"](
        account,
        contractAddr
    ).call();
    let decimal = await tokenContract.methods["decimals"]().call();
    remain = remain / 10 ** decimal;
    return remain;
};

export const approveToken = async (
    account,
    provider,
    tokenAddr,
    value,
    contractAddr
) => {
    const tokenAbi = erc20ABI[0];
    let web3 = new Web3(provider);
    let token_contract = new web3.eth.Contract(tokenAbi, tokenAddr);
    const weiVal = await toWeiVal(provider, tokenAddr, value);
    try {
        await token_contract.methods["approve"](
            contractAddr,
            weiVal
        ).send({ from: account });
    } catch (e) {
        console.log(e.message);
    }
    const result = await tokenApproval(account, provider, tokenAddr, contractAddr);
    return result;
};

export const swapTokens = async (
    provider,
    inTokenAddr,
    outTokenAddr,
    amount,
    account,
    limit,
    deadTime,
    contractAddr
) => {
    const abi = routerABI[0];
    let web3 = new Web3(provider);
    let wei_amount = "0";
    let wei_limit = "0";
    if (inTokenAddr === "0x0000000000000000000000000000000000000000")
        wei_amount = web3.utils.toWei(amount.toString());
    else
        wei_amount = await toWeiVal(provider, inTokenAddr, amount);

    if (outTokenAddr === "0x0000000000000000000000000000000000000000")
        wei_limit = web3.utils.toWei(limit.toString());
    else
        wei_limit = await toWeiVal(provider, outTokenAddr, limit);
    let deadline = new Date().getTime() + 1000 * deadTime;
    let contract = new web3.eth.Contract(abi, contractAddr);
    try {
        if (inTokenAddr === "0x0000000000000000000000000000000000000000")
            await contract.methods["swap"](
                [inTokenAddr, outTokenAddr, wei_amount],
                [account, account],
                wei_limit,
                deadline
            ).send({ from: account, value: wei_amount });
        else
            await contract.methods["swap"](
                [inTokenAddr, outTokenAddr, wei_amount],
                [account, account],
                wei_limit,
                deadline
            ).send({ from: account });
    } catch (e) {
        console.log(e.message);
    }
};

export const batchSwapTokens = async (
    provider,
    inTokenAddr,
    outTokenAddr,
    middleTokens,
    amount,
    account,
    limit,
    deadTime,
    contractAddr
) => {
    const abi = routerABI[0];
    let web3 = new Web3(provider);
    let wei_amount = "0";
    // let wei_limit = "0";
    if (inTokenAddr === "0x0000000000000000000000000000000000000000")
        wei_amount = web3.utils.toWei(amount.toString());
    else
        wei_amount = await toWeiVal(provider, inTokenAddr, amount);

    // if (outTokenAddr === "0x0000000000000000000000000000000000000000")
    //     wei_limit = web3.utils.toWei(limit.toString());
    // else
    //     wei_limit = await toWeiVal(provider, outTokenAddr, limit);
    let deadline = new Date().getTime() + 1000 * deadTime;
    const traders = [account, account];

    let swaps = [];

    if (middleTokens.length === 1)
        swaps = [
            [0, 1, wei_amount],
            [1, 2, web3.utils.toWei("0")],
        ];
    else
        swaps = [
            [0, 1, wei_amount],
            [1, 2, web3.utils.toWei("0")],
            [2, 3, web3.utils.toWei("0")],
        ];

    let assets = [];

    if (middleTokens.length === 1)
        assets = [inTokenAddr, middleTokens[0]["address"], outTokenAddr];
    else
        assets = [
            inTokenAddr,
            middleTokens[0]["address"],
            middleTokens[1]["address"],
            outTokenAddr,
        ];

    let limits = [];

    if (middleTokens.length === 1)
        limits = [wei_amount, web3.utils.toWei("0"), web3.utils.toWei("0")];
    else
        limits = [
            wei_amount,
            web3.utils.toWei("0"),
            web3.utils.toWei("0"),
            web3.utils.toWei("0"),
        ];
    if (middleTokens) {
        const contract = new web3.eth.Contract(abi, contractAddr);
        try {
            if (inTokenAddr === "0x0000000000000000000000000000000000000000")
                await contract.methods["batchSwap"](
                    swaps,
                    assets,
                    traders,
                    limits,
                    deadline
                ).send({ from: account, value: wei_amount });
            else
                await contract.methods["batchSwap"](
                    swaps,
                    assets,
                    traders,
                    limits,
                    deadline
                ).send({ from: account });
        } catch (e) {
            console.log(e.message);
        }
    }
};

export const joinPool = async (
    account,
    provider,
    token1Addr,
    token2Addr,
    amount1,
    amount2,
    slippage,
    routerContractAddr,
    factoryContractAddr,
    isCoin1,
    isCoin2
) => {
    const abi = routerABI[0];
    const web3 = new Web3(provider);
    const poolAddr = await getPoolAddress(
        provider,
        token1Addr,
        token2Addr,
        factoryContractAddr
    );

    if (poolAddr) {
        const poolData = await getPoolData(provider, poolAddr);
        let tokenA = "";
        let tokenB = "";
        let amountA = 0;
        let amountB = 0;
        let inAmount = "0";
        let inMaxAmount = "0";
        let outAmount = "0";
        let outMaxAmount = "0";

        if (poolData["tokens"][0].toLowerCase() === token1Addr.toLowerCase()) {
            tokenA = token1Addr;
            tokenB = token2Addr;
            amountA = amount1;
            amountB = amount2;

            if (isCoin1) {
                inAmount = web3.utils.toWei(amountA.toString());
                inMaxAmount = web3.utils.toWei((amountA * (1 + slippage)).toString());
            }
            else {
                inAmount = await toWeiVal(provider, tokenA, amountA);
                inMaxAmount = await toWeiVal(provider, tokenA, amountA * (1 + slippage));
            }

            if (isCoin2) {
                outAmount = web3.utils.toWei(amountB.toString());
                outMaxAmount = web3.utils.toWei((amountB * (1 + slippage)).toString());
            } else {
                outAmount = await toWeiVal(provider, tokenB, amountB);
                outMaxAmount = await toWeiVal(provider, tokenB, amountB * (1 + slippage))
            }
        } else {
            tokenA = token2Addr;
            tokenB = token1Addr;
            amountA = amount2;
            amountB = amount1;

            if (isCoin2) {
                inAmount = web3.utils.toWei(amountA.toString());
                inMaxAmount = web3.utils.toWei((amountA * (1 + slippage)).toString());
            }
            else {
                inAmount = await toWeiVal(provider, tokenA, amountA);
                inMaxAmount = await toWeiVal(provider, tokenA, amountA * (1 + slippage));
            }

            if (isCoin1) {
                outAmount = web3.utils.toWei(amountB.toString());
                outMaxAmount = web3.utils.toWei((amountB * (1 + slippage)).toString());
            } else {
                outAmount = await toWeiVal(provider, tokenB, amountB);
                outMaxAmount = await toWeiVal(provider, tokenB, amountB * (1 + slippage))
            }
        }

        const initUserData = ethers.utils.defaultAbiCoder.encode(
            ["uint256", "uint256[]", "uint256"],
            [
                "1",
                //amounts In
                [inAmount, outAmount],
                //minimum amount of Lp tokens you are willing to accept
                web3.utils.toWei("0"),
            ]
        );

        // let token1_contract = new web3.eth.Contract(tokenAbi, token1Addr);
        // await token1_contract.methods['increaseAllowance'](c_address, inAmount).send({from: account});

        // let token2_contract = new web3.eth.Contract(tokenAbi, token2Addr);
        // await token2_contract.methods['increaseAllowance'](c_address, outAmount).send({from: account});
        let contract = new web3.eth.Contract(abi, routerContractAddr);
        try {
            if (isCoin1 || isCoin2) {
                if (poolData["tokens"][0].toLowerCase() === token1Addr.toLowerCase()) {
                    await contract.methods["joinPool"](account, [
                        [isCoin1 ? "0x0000000000000000000000000000000000000000" : tokenA,
                        isCoin2 ? "0x0000000000000000000000000000000000000000" : tokenB],
                        [inMaxAmount, outMaxAmount],
                        initUserData,
                    ]).send({ from: account, value: isCoin1 ? inAmount : outAmount });
                } else {
                    await contract.methods["joinPool"](account, [
                        [isCoin2 ? "0x0000000000000000000000000000000000000000" : tokenA,
                        isCoin1 ? "0x0000000000000000000000000000000000000000" : tokenB],
                        [inMaxAmount, outMaxAmount],
                        initUserData,
                    ]).send({ from: account, value: isCoin2 ? inAmount : outAmount });
                }
            }
            else
                await contract.methods["joinPool"](account, [
                    [tokenA, tokenB],
                    [inMaxAmount, outMaxAmount],
                    initUserData,
                ]).send({ from: account });
        } catch (e) {
            console.log(e.message);
        }
    }
};

export const joinOnePool = async (
    account,
    provider,
    token1Addr,
    token2Addr,
    amount1,
    amount2,
    slippage,
    routerContractAddr,
    factoryContractAddr,
    isCoin1,
    isCoin2
) => {
    const abi = routerABI[0];
    const web3 = new Web3(provider);
    const poolAddr = await getPoolAddress(
        provider,
        token1Addr,
        token2Addr,
        factoryContractAddr
    );

    if (poolAddr) {
        const poolData = await getPoolData(provider, poolAddr);
        let tokenA = "";
        let tokenB = "";
        let amountA = 0;
        let amountB = 0;
        let inAmount = "0";
        let inMaxAmount = "0";
        let outAmount = "0";
        let outMaxAmount = "0";
        if (poolData["tokens"][0].toLowerCase() === token1Addr.toLowerCase()) {
            tokenA = token1Addr;
            tokenB = token2Addr;
            amountA = amount1;
            amountB = amount2;

            if (isCoin1) {
                inAmount = web3.utils.toWei(amountA.toString());
                inMaxAmount = web3.utils.toWei((amountA * (1 + slippage)).toString());
            }
            else {
                inAmount = await toWeiVal(provider, tokenA, amountA);
                inMaxAmount = await toWeiVal(provider, tokenA, amountA * (1 + slippage));
            }

            if (isCoin2) {
                outAmount = web3.utils.toWei(amountB.toString());
                outMaxAmount = web3.utils.toWei((amountB * (1 + slippage)).toString());
            } else {
                outAmount = await toWeiVal(provider, tokenB, amountB);
                outMaxAmount = await toWeiVal(provider, tokenB, amountB * (1 + slippage))
            }
        } else {
            tokenA = token2Addr;
            tokenB = token1Addr;
            amountA = amount2;
            amountB = amount1;

            if (isCoin2) {
                inAmount = web3.utils.toWei(amountA.toString());
                inMaxAmount = web3.utils.toWei((amountA * (1 + slippage)).toString());
            }
            else {
                inAmount = await toWeiVal(provider, tokenA, amountA);
                inMaxAmount = await toWeiVal(provider, tokenA, amountA * (1 + slippage));
            }

            if (isCoin1) {
                outAmount = web3.utils.toWei(amountB.toString());
                outMaxAmount = web3.utils.toWei((amountB * (1 + slippage)).toString());
            } else {
                outAmount = await toWeiVal(provider, tokenB, amountB);
                outMaxAmount = await toWeiVal(provider, tokenB, amountB * (1 + slippage))
            }
        }

        const initUserData = ethers.utils.defaultAbiCoder.encode(
            ["uint256", "uint256", "uint256", "uint256"],
            [
                "2",
                //amounts In
                Number(inAmount) === 0 ? outAmount : inAmount,
                Number(inAmount) === 0 ? "1" : "0",
                //minimum amount of Lp tokens you are willing to accept
                web3.utils.toWei("0"),
            ]
        );

        // let token1_contract = new web3.eth.Contract(tokenAbi, token1Addr);
        // await token1_contract.methods['increaseAllowance'](c_address, inAmount).send({from: account});

        // let token2_contract = new web3.eth.Contract(tokenAbi, token2Addr);
        // await token2_contract.methods['increaseAllowance'](c_address, outAmount).send({from: account});
        let contract = new web3.eth.Contract(abi, routerContractAddr);
        try {
            if (isCoin1 || isCoin2) {
                if (poolData["tokens"][0].toLowerCase() === token1Addr.toLowerCase()) {
                    await contract.methods["joinPool"](account, [
                        [isCoin1 ? "0x0000000000000000000000000000000000000000" : tokenA,
                        isCoin2 ? "0x0000000000000000000000000000000000000000" : tokenB],
                        [inMaxAmount, outMaxAmount],
                        initUserData,
                    ]).send({ from: account, value: isCoin1 ? inAmount : outAmount });
                } else {
                    await contract.methods["joinPool"](account, [
                        [isCoin2 ? "0x0000000000000000000000000000000000000000" : tokenA,
                        isCoin1 ? "0x0000000000000000000000000000000000000000" : tokenB],
                        [inMaxAmount, outMaxAmount],
                        initUserData,
                    ]).send({ from: account, value: isCoin2 ? inAmount : outAmount });
                }
            }
            else
                await contract.methods["joinPool"](account, [
                    [tokenA, tokenB],
                    [inMaxAmount, outMaxAmount],
                    initUserData,
                ]).send({ from: account });
        } catch (e) {
            console.log(e.message);
        }
    }
};

export const initAddPool = async (
    account,
    provider,
    token1Addr,
    token2Addr,
    amountA,
    amountB,
    routerContractAddr
) => {
    const abi = routerABI[0];
    let web3 = new Web3(provider);
    let token1_wei_val = "0";
    let token2_wei_val = "0";
    if (token1Addr === "0x0000000000000000000000000000000000000000")
        token1_wei_val = web3.utils.toWei(amountA.toString());
    else
        token1_wei_val = await toWeiVal(provider, token1Addr, amountA);
    if (token2Addr === "0x0000000000000000000000000000000000000000")
        token2_wei_val = web3.utils.toWei(amountB.toString());
    else
        token2_wei_val = await toWeiVal(provider, token2Addr, amountB);
    debugger;
    const initialBalances = [token2_wei_val, token1_wei_val];
    const JOIN_KIND_INIT = "0";

    const initUserData = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256[]"],
        [JOIN_KIND_INIT, initialBalances]
    );

    let contract = new web3.eth.Contract(abi, routerContractAddr);
    try {
        if (token1Addr === "0x0000000000000000000000000000000000000000" || token2Addr === "0x0000000000000000000000000000000000000000")
            await contract.methods["joinPool"](account, [
                [token2Addr, token1Addr],
                initialBalances,
                initUserData,
            ]).send({ from: account, value: (token1Addr === "0x0000000000000000000000000000000000000000") ? token1_wei_val : token2_wei_val });
        else {
            await contract.methods["joinPool"](account, [
                [token2Addr, token1Addr],
                initialBalances,
                initUserData,
            ]).send({ from: account });
        }
        alert(`Successfully created!`, "success");
    } catch (e) {
        console.log(e.message);
    }
}

export const getPoolBalance = async (account, provider, poolAddr) => {
    const abi = poolABI[0];
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(abi);
    contract.options.address = poolAddr;
    const result = await contract.methods["balanceOf"](account).call();
    const decimal = await contract.methods["decimals"]().call();
    return result / 10 ** decimal;
};

export const getPoolSupply = async (provider, poolAddr) => {
    const abi = poolABI[0];
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(abi);
    contract.options.address = poolAddr;
    const result = await contract.methods["totalSupply"]().call();
    return web3.utils.fromWei(result);
};

export const getSwapFeePercent = async (provider, poolAddr) => {
    const abi = poolABI[0];
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(abi);
    contract.options.address = poolAddr;
    const result = await contract.methods["getSwapFeePercentage"]().call();
    return web3.utils.fromWei(result) * 100;
};

export const removePool = async (
    account,
    provider,
    amount,
    ratio,
    token1Addr,
    token2Addr,
    token1Amount,
    token2Amount,
    slippage,
    contractAddr
) => {
    const abi = routerABI[0];
    let web3 = new Web3(provider);
    const totalAmount = await web3.utils.toWei((Math.floor(amount * Math.pow(10, 16)) / Math.pow(10, 16)).toFixed(16));
    const tokenRatio = await web3.utils.toWei(ratio.toString());

    const initUserData = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256"],
        [totalAmount, tokenRatio]
    );

    const limit1 = (token1Amount > 0.00001 && token2Amount > 0.00001) ? await toWeiVal(provider, token1Addr, (token1Amount * (1 - 0.3 - slippage)).toString()) : "0";
    const limit2 = (token1Amount > 0.00001 && token2Amount > 0.00001) ? await toWeiVal(provider, token2Addr, (token2Amount * (1 - 0.3 - slippage)).toString()) : "0";


    let contract = new web3.eth.Contract(abi, contractAddr);
    try {
        await contract.methods["exitPool"](account, [
            [token1Addr, token2Addr],
            [limit1, limit2],
            initUserData,
        ]).send({ from: account });
    } catch (e) {
        console.log(e.message);
    }
};

export const createPool = async (
    account,
    provider,
    tokenAddr1,
    tokenAddr2,
    weight1,
    weight2,
    contractAddr,
    tradingFee
) => {
    const abi = hedgeFactoryABI[0];
    let web3 = new Web3(provider);
    const contract = new web3.eth.Contract(abi, contractAddr);
    const weight1_str = web3.utils.toWei(weight1.toString());
    const weight2_str = web3.utils.toWei(weight2.toString());
    const swap_fee = web3.utils.toWei((tradingFee*0.01).toString());
    try {
        await contract.methods["create"](tokenAddr1, tokenAddr2, weight1_str, weight2_str, swap_fee, true).send({ from: account });
    } catch (e) {
        console.log(e.message);
    }

}

// Get All Pools
export const getAllPools = async (provider, account, contractAddr) => {
  let web3 = new Web3(provider);
  const factoryABI = hedgeFactoryABI[0];
  const factoryContract = new web3.eth.Contract(factoryABI, contractAddr);
  const pAbi = poolABI[0];
  const poolContract = new web3.eth.Contract(pAbi);
  let pLength = await factoryContract.methods["allPoolsLength"]().call();
  let pools = [];
  for (let i = 0; i < pLength; i++) {
    let poolAddress = await factoryContract.methods["allPools"](i).call();
    poolContract.options.address = poolAddress;
    let poolTokenAndBalance = await poolContract.methods[
      "getPoolTokensAndBalances"
    ]().call();
    let weight = await poolContract.methods["getWeights"]().call();
    new Promise((resolve) => setTimeout(resolve, 1000));
    let supply = await poolContract.methods["totalSupply"]().call();
    new Promise((resolve) => setTimeout(resolve, 1000));
    let userlp = ethers.utils.formatEther(supply.toString());
    await axios
      .get(
        `https://coins.llama.fi/prices/current/kava:${poolTokenAndBalance?.tokens[0]},kava:${poolTokenAndBalance?.tokens[1]}?searchWidth=6h`
      )
      .then(async (response) => {
        let a =
          (ethers.utils.formatEther(poolTokenAndBalance?.balances[0]) *
            (ethers.utils.formatEther(weight[0]) * 100)) /
          (ethers.utils.formatEther(poolTokenAndBalance?.balances[1]) *
            (ethers.utils.formatEther(weight[1]) * 100));
        let b =
          (ethers.utils.formatEther(poolTokenAndBalance?.balances[1]) *
            (ethers.utils.formatEther(weight[1]) * 100)) /
          (ethers.utils.formatEther(poolTokenAndBalance?.balances[0]) *
            (ethers.utils.formatEther(weight[0]) * 100));
        if (
          response?.data?.coins[Object.keys(response?.data?.coins)[0]]?.price >
            0.9 &&
          response?.data?.coins[Object.keys(response?.data?.coins)[0]]?.price <
            1.1
        ) {
          let lp =
            (b * (poolTokenAndBalance?.balances[1] / 10 ** 18) +
              poolTokenAndBalance?.balances[0] / 10 ** 18) /
            (supply / 10 ** 18);
          pools.push({
            address: poolAddress,
            totalSupply: (lp * userlp),
          });
        } else if (
          response?.data?.coins[Object.keys(response?.data?.coins)[1]]?.price >
            0.9 &&
          response?.data?.coins[Object.keys(response?.data?.coins)[1]]?.price <
            1.1
        ) {
          let lp =
            (a * (poolTokenAndBalance?.balances[0] / 10 ** 18) +
              poolTokenAndBalance?.balances[1] / 10 ** 18) /
            supply;
          pools.push({
            address: poolAddress,
            totalSupply: (lp * userlp),
          });
        } else {
          let lp =
            (a * (poolTokenAndBalance?.balances[0] / 10 ** 18) +
              poolTokenAndBalance?.balances[1] / 10 ** 18) /
            supply;
          pools.push({
            address: poolAddress,
            totalSupply: (lp * userlp),
          });
        }
      });
  }
  return pools;
};

// User Holding in All Pools ----------------------------------------------------------------------
export const getHoldingInLP = async (provider, account, contractAddr, poolList) => {
  let web3 = new Web3(provider);
  const tokenAbi = erc20ABI[0];
  const factoryABI = hedgeFactoryABI[0];
  const factoryContract = new web3.eth.Contract(factoryABI, contractAddr);
  const pAbi = poolABI[0];
  let tvlBalance = 0;
  let LPHolding = [];
  for (let i = 0; i < poolList.length; i++) {
    try {
        let poolAddress = poolList[i].address;
        let poolContract = new web3.eth.Contract(pAbi, poolAddress);
        const poolTokenAndBalance = await poolContract.methods.getPoolTokensAndBalances().call();
        const weight = await poolContract.methods["getWeights"]().call();
        let tokenContract1 = new web3.eth.Contract(tokenAbi, poolTokenAndBalance["tokens"][0]);
        let tokenContract2 = new web3.eth.Contract(tokenAbi, poolTokenAndBalance["tokens"][1]);
        let decimal1 = await tokenContract1.methods["decimals"]().call();
        let decimal2 = await tokenContract2.methods["decimals"]().call();
        const supply = await poolContract.methods["totalSupply"]().call();
        const initialPoolData = await getInitialPoolData(poolAddress);        
        const lp_balance = await poolContract.methods["balanceOf"](account).call();
        tvlBalance =
          tvlBalance +
          parseInt(lp_balance);
        let userlp = ethers.utils.formatEther(lp_balance);
        if(Number(userlp) !== 0) {
            let apr = calcAPR(initialPoolData, supply, poolTokenAndBalance, weight, decimal1, decimal2);
            await axios
              .get(
                `https://coins.llama.fi/prices/current/kava:${poolTokenAndBalance?.tokens[0]},kava:${poolTokenAndBalance?.tokens[1]}?searchWidth=6h`
              )
              .then(async (response) => {
                if(Object.keys(response?.data?.coins)[0]) {
                    if("kava:"+poolTokenAndBalance?.tokens[0].toLowerCase() === Object.keys(response?.data?.coins)[0].toLowerCase()) {
                        let lp = (response?.data?.coins[Object.keys(response?.data?.coins)[0]]?.price*(poolTokenAndBalance?.balances[0]/10**decimal1) + 
                            response?.data?.coins[Object.keys(response?.data?.coins)[1]]?.price*(poolTokenAndBalance?.balances[1]/10**decimal2))/(supply/10**18);
                        LPHolding.push({
                            address: poolAddress,
                            apr:apr,
                            totalSupply: (lp * userlp),
                          });
                    } else {
                        let lp = (response?.data?.coins[Object.keys(response?.data?.coins)[1]]?.price*(poolTokenAndBalance?.balances[0]/10**decimal1) + 
                            response?.data?.coins[Object.keys(response?.data?.coins)[0]]?.price*(poolTokenAndBalance?.balances[1]/10**decimal2))/(supply/10**18);
                        LPHolding.push({
                            address: poolAddress,
                            apr:apr,
                            totalSupply: (lp * userlp),
                          });
                    }
                } else {
                    LPHolding.push({
                        address: poolAddress,
                        apr:apr,
                        totalSupply: 0,
                      });
                }
              });
        }
    } catch (e) {
        console.log(e.message);
        i--;
    }
  }
  return [tvlBalance, LPHolding];
};

const calcAPR = (initialPoolData, supply, poolTokenAndBalance, weights, decimal1, decimal2) => {
    let r1 = (initialPoolData.amountsIn[0]/10**decimal1)/(initialPoolData.liquidity);
    let r2 = (initialPoolData.amountsIn[1]/10**decimal2)/(initialPoolData.liquidity);
    let k1 = r1*(initialPoolData.pool.weight0/10**18)*r2*(initialPoolData.pool.weight1/10**18);
    let r11 = (poolTokenAndBalance.balances[0]/10**decimal1)/(supply/10**18);
    let r22 = (poolTokenAndBalance.balances[1]/10**decimal2)/(supply/10**18);
    let k2 = r11*(weights[0]/10**18)*r22*(weights[1]/10**18);
    let apr_yield = (k2/k1)-1;
    const date1 = new Date(initialPoolData.timestamp*1000);
    const date2 = new Date();
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    let apy = (apr_yield/diffDays)*365;
    let apr = ((apy+1)**(1/52)-1)*52;
    return apr;
}

const toWeiVal = async (provider, tokenAddr, val) => {
    const abi = erc20ABI[0];
    const web3 = new Web3(provider);

    const contract = new web3.eth.Contract(abi, tokenAddr);
    let decimal = await contract.methods["decimals"]().call();
    decimal = Number(decimal);
    let value = Number((Math.floor(val * Math.pow(10, decimal)) / Math.pow(10, decimal)).toFixed(decimal));
    try {
        let tval = web3.utils.toBN(toLongNum(value * (10 ** decimal)).toFixed(0)).toString();
        return tval;
    } catch (error) {
        let tval = web3.utils.toBN(toLongNum(value * (10 ** decimal))).toString();
        return tval;
    }
};

export const fromWeiVal = (provider, val, dec) => {
    // let web3 = new Web3(provider);
    let decimal = Number(dec);
    let value = val.toString();
    let tval = toLongNum(value / (10 ** decimal));
    return tval
};

export const toLongNum = (x) => {
    if (Math.abs(x) < 1.0) {
        let e1 = parseInt(x.toString().split('e-')[1]);
        if (e1) {
            x *= Math.pow(10, e1 - 1);
            x = '0.' + (new Array(e1)).join('0') + x.toString().substring(2);
        }
    } else {
        let e2 = parseInt(x.toString().split('+')[1]);
        if (e2 > 20) {
            e2 -= 20;
            x /= Math.pow(10, e2);
            x += (new Array(e2 + 1)).join('0');
        }
    }
    return x;
}


// getting faucet tokens part

export const requestToken = async (account, provider, faucetAddr) => {
    const abi = faucetABI[0];
    let web3 = new Web3(provider);

    let contract = new web3.eth.Contract(abi, faucetAddr);
    await contract.methods["requestTokens"]().send({ from: account });
};

export const allowedToWithdraw = async (account, provider, faucetAddr) => {
    const abi = faucetABI[0];
    let web3 = new Web3(provider);

    let contract = new web3.eth.Contract(abi, faucetAddr);
    let allowed = await contract.methods["allowedToWithdraw"](account).call();
    return allowed;
};

// find router part

export const calculateSwap = async (inToken, poolData, input) => {
    let balance_from;
    let balance_to;
    let weight_from;
    let weight_to;
    let decimal_from;
    let decimal_to;

    if (inToken.toLowerCase() === poolData.tokens[0].toLowerCase()) {
        balance_from = poolData.balances[0];
        balance_to = poolData.balances[1];
        weight_from = poolData.weights[0];
        weight_to = poolData.weights[1];
        decimal_from = poolData.decimals[0];
        decimal_to = poolData.decimals[1];
    } else {
        balance_from = poolData.balances[1];
        balance_to = poolData.balances[0];
        weight_from = poolData.weights[1];
        weight_to = poolData.weights[0];
        decimal_from = poolData.decimals[1];
        decimal_to = poolData.decimals[0];
    }

    let ammount = input * 10 ** decimal_from;

    let bIn = ammount / 10 ** decimal_from;
    let pbA = balance_to / 10 ** decimal_to;
    let pbB = balance_from / 10 ** decimal_from;
    let wA = weight_to / 10 ** 18;
    let wB = weight_from / 10 ** 18;

    let exp =
        (wB - (wB * (1 - pbB / (pbB + bIn))) / (1 + pbB / (pbB + bIn))) /
        (wA + (wB * (1 - pbB / (pbB + bIn))) / (1 + pbB / (pbB + bIn)));
    let bOut = pbA * (1 - (pbB / (pbB + bIn)) ** exp);
    return bOut;
};

export const calcOutput = async (
    middleTokens,
    provider,
    val,
    inSToken,
    outSToken,
    factoryContractAddr,
    swapFee
) => {
    try {
        if (middleTokens.length === 1) {
            const poolAddressA = await getPoolAddress(
                provider,
                inSToken["address"],
                middleTokens[0]["address"],
                factoryContractAddr
            );
            const poolDataA = await getPoolData(
                provider,
                poolAddressA
            );
            const poolAddressB = await getPoolAddress(
                provider,
                middleTokens[0]["address"],
                outSToken["address"],
                factoryContractAddr
            );
            const poolDataB = await getPoolData(
                provider,
                poolAddressB
            );
            const middleOutput = await calculateSwap(
                inSToken["address"],
                poolDataA,
                val * (1 - swapFee)
            );
            const output = await calculateSwap(
                middleTokens[0]["address"],
                poolDataB,
                middleOutput * (1 - swapFee)
            );
            return output;
        } else {
            const poolAddressA = await getPoolAddress(
                provider,
                inSToken["address"],
                middleTokens[0]["address"],
                factoryContractAddr
            );
            const poolDataA = await getPoolData(
                provider,
                poolAddressA
            );
            const poolAddressB = await getPoolAddress(
                provider,
                middleTokens[0]["address"],
                middleTokens[1]["address"],
                factoryContractAddr
            );
            const poolDataB = await getPoolData(
                provider,
                poolAddressB
            );
            const poolAddressC = await getPoolAddress(
                provider,
                middleTokens[1]["address"],
                outSToken["address"],
                factoryContractAddr
            );
            const poolDataC = await getPoolData(
                provider,
                poolAddressC
            );
            const middleOutput1 = await calculateSwap(
                inSToken["address"],
                poolDataA,
                val * (1 - swapFee)
            );
            const middleOutput2 = await calculateSwap(
                middleTokens[0]["address"],
                poolDataB,
                middleOutput1 * (1 - swapFee)
            );
            const output = await calculateSwap(
                middleTokens[1]["address"],
                poolDataC,
                middleOutput2 * (1 - swapFee)
            );
            return output;
        }
    } catch (error) {
        return -1;
    }
};

export const getMiddleToken = async (inValue, inSToken, outSToken, tokenList, provider, factoryContractAddr, swapFee) => {
    const availableLists = tokenList.filter((item) => {
        return (
            item["address"].toLowerCase() !== inSToken["address"].toLowerCase() &&
            item["address"].toLowerCase() !== outSToken["address"].toLowerCase() &&
            item["address"] !== "0x0000000000000000000000000000000000000000"
        );
    });
    let suitableRouter = [];
    // const provider = await connector.getProvider();
    for (let i = 0; i < availableLists.length; i++) {
        const calculatedOutput = await calcOutput(
            [availableLists[i]],
            provider,
            inValue,
            inSToken,
            outSToken,
            factoryContractAddr,
            swapFee
        );
        if (suitableRouter.length === 0) {
            if (Number(calculatedOutput) > 0) {
                suitableRouter[0] = [availableLists[i]];
                suitableRouter[1] = calculatedOutput;
            }
        } else {
            if (Number(calculatedOutput) > Number(suitableRouter[1])) {
                suitableRouter[0] = [availableLists[i]];
                suitableRouter[1] = calculatedOutput;
            }
        }
    }

    const allPairs = getPairs(availableLists);
    for (let i = 0; i < allPairs.length; i++) {
        const calculatedOutput = await calcOutput(
            allPairs[i],
            provider,
            inValue,
            inSToken,
            outSToken,
            factoryContractAddr,
            swapFee
        );
        if (suitableRouter.length === 0) {
            if (Number(calculatedOutput) > 0) {
                suitableRouter[0] = allPairs[i];
                suitableRouter[1] = calculatedOutput;
            }
        } else {
            if (Number(calculatedOutput) > Number(suitableRouter[1])) {
                suitableRouter[0] = allPairs[i];
                suitableRouter[1] = calculatedOutput;
            }
        }
    }

    try {
        const poolAddress = await getPoolAddress(
            provider,
            inSToken["address"],
            outSToken["address"],
            factoryContractAddr
        );
        const poolData = await getPoolData(provider, poolAddress);
        const result = await calculateSwap(
            inSToken["address"],
            poolData,
            inValue
        );
        if (suitableRouter.length !== 0) {
            if (Number(result) > Number(suitableRouter[1])) {
                return null;
            } else return suitableRouter[0];
        } else return null;
    } catch (error) {
        if (suitableRouter.length !== 0) {
            return suitableRouter[0];
        } else {
            return null;
        }
    }
};

export const getPairs = (arr) => {
    return arr.flatMap((x) => {
        return arr.flatMap((y) => {
            return x["address"] !== y["address"] ? [[x, y]] : [];
        });
    });
};

export const getERC20TokenData = async (address, provider, selected_chain, tokenList) => {
    const index = tokenList.findIndex(each => each.address === Web3.utils.toChecksumAddress(address));
    if (index !== -1) return tokenList.slice(index, index + 1);
    const abi = erc20ABI[0];
    let web3 = new Web3(provider);
    const contract = new web3.eth.Contract(abi, address);
    try {
        const result = await Promise.all([contract.methods.name().call(), contract.methods.symbol().call(), contract.methods.decimals().call()]);
        let name = result[0];
        let symbol = result[1];
        let decimals = result[2];
        return [{value: symbol.toLowerCase(), chainId: chainIds[selected_chain], address: Web3.utils.toChecksumAddress(address), symbol, name, decimals, logoURL: "/icons/unknown.svg", tags: ["Token"], custom: true, added: false}]
    } catch(e) {
        return []
    }
}

export const getPoolList = async (provider, poolAddress, tokenList, selected_chain, poolList) => {
    const index = poolList.findIndex(each => each.address === Web3.utils.toChecksumAddress(poolAddress));
    if (index !== -1) return poolList.slice(index, index + 1);
    const abi = poolABI[0];
    const tokenAbi = erc20ABI[0];
    let web3 = new Web3(provider);
    let contract = new web3.eth.Contract(abi, poolAddress);
    try {
        let result = await contract.methods.getPoolTokensAndBalances().call();
        const token0 = result.tokens[0];
        const token1 = result.tokens[1];
        let symbol0, symbol1, logo0, logo1;
        for(let token of tokenList[selected_chain]) {
            if (token.address.toLowerCase() === token0.toLowerCase()) {
                symbol0 = token.symbol;
                logo0 = token.logoURL;
            }
            if (token.address.toLowerCase() === token1.toLowerCase()) {
                symbol1 = token.symbol;
                logo1 = token.logoURL;
            }
            if (symbol0 && symbol1) break;
        }
        if (!symbol0) {
            let tokenContract = new web3.eth.Contract(tokenAbi, token0);
            symbol0 = await tokenContract.methods.symbol();
            logo0 = "/icons/unknown.svg";
        }
        if (!symbol1) {
            let tokenContract = new web3.eth.Contract(tokenAbi, token1);
            symbol1 = await tokenContract.methods.symbol();
            logo1 = "/icons/unknown.svg";
        }
        return [
            {value: "other", address: Web3.utils.toChecksumAddress(poolAddress), symbols: [symbol0, symbol1], logoURLs: [logo0, logo1], custom: true, added: false}
        ]
    }
    catch (e) {
        return [];
    }
}
