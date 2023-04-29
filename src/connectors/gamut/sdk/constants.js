export const handleValueTime = 500 // 0.5s

export const contractAddresses = {
	'kava': {
		'router': '0x923A7273480e73439b73b065d096c58034968504',
		'hedgeFactory': '0xbD4C56E952c238389AEE995E1ed504cA646D199B'
	}
}

export const defaultTokenList = {
	'kava': [
		{ value: "kava", chainId: 2222, address: "0x0000000000000000000000000000000000000000", symbol: "KAVA", name: "KAVA Coin", decimals: 18, logoURL: "https://assets-cdn.trustwallet.com/blockchains/kava/info/logo.png", tags: ["Coin"] },
		{ value: "busd", chainId: 2222, address: "0x332730a4F6E03D9C55829435f10360E13cfA41Ff", symbol: "BUSD", name: "BUSD Coin", decimals: 18, logoURL: "https://cryptologos.cc/logos/binance-usd-busd-logo.png", tags: ["stablecoin"] },
		{ value: "wkava", chainId: 2222, address: "0xc86c7C0eFbd6A49B35E8714C5f59D99De09A225b", symbol: "WKAVA", name: "Wrapped KAVA", decimals: 18, logoURL: "https://assets-cdn.trustwallet.com/blockchains/kava/info/logo.png", tags: ["Coin"] },
	]
}

export const defaultProvider = {
	'kava': 'https://evm.kava.io'
}

export const chainIds = {
	'kava': 2222
}

export const userSettings = "Gamut_settings";
export const customList = "customList";
export const customPoolList = "customPoolList";
export const tokenListLink = "https://gateway.pinata.cloud/ipfs/QmSxSrj95qFFr4JhUshYBa17wLR7XeXETE47xjEd8TcSU4";

export const poolList = {
	'kava': [
		{ value: "other", address: "0x6be57618c8832ad25cceadf2745d5c92de7ab7b2", symbols: ["BUSD", "WKAVA"], logoURLs: ["/icons/busd.svg", "/icons/wkava.png"] },
		{ value: "other", address: "0xbd3d481e308a6f2fa6714ba3dc33e68ab3915557", symbols: ["DAI", "WBTC"], logoURLs: ["/icons/dai.svg", "/icons/wbtc.png"] },
		{ value: "other", address: "0x9d102ce615ab35ceddda899be47a8da5dc139460", symbols: ["BUSD", "DAI"], logoURLs: ["/icons/busd.svg", "/icons/dai.svg"] },
		{ value: "other", address: "0x1e34dd2f920630e6af04519221ed9004608a6c52", symbols: ["DAI", "WKAVA"], logoURLs: ["/icons/dai.svg", "/icons/wkava.png"] },
		{ value: "other", address: "0xbd87cd1512763eefc14b3717ff42538022e95c95", symbols: ["USDT", "ETH"], logoURLs: ["/icons/usdt.png", "/icons/eth.png"] },
		{ value: "other", address: "0x9f065518185436fbdd72fd7ca7fd99ccaf3f061a", symbols: ["DAI", "USDC"], logoURLs: ["/icons/dai.svg", "/icons/usdc.svg"] },
		{ value: "other", address: "0x02bd2e7f107a15ce8b6414df67f4a7e662218bc9", symbols: ["DAI", "USDT"], logoURLs: ["/icons/dai.svg", "/icons/usdt.svg"] },
		{ value: "other", address: "0x545236b930e5f5f339934296a5d442014978706f", symbols: ["WKAVA", "ETH"], logoURLs: ["/icons/wkava.svg", "/icons/eth.svg"] },
	]
}
