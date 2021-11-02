import addresses from '../common/token_addresses.json';

export default {
    DEFAULT_LTV: 4,
    MAX_LTV: 5,
    chainId: 31337,
    ASSETS_CONFIG: {
      "AVAX": {name: "AVAX", symbol: "AVAX", decimals: 18},
      "ETH": {name: "Ether", symbol: "ETH", decimals: 18, address: addresses.ETH},
      "BTC": {name: "Bitcoin", symbol: "BTC", decimals: 8, address: addresses.BTC},
      "LINK": {name: "Link", symbol: "LINK", decimals: 18, address: addresses.LINK},
      "USDT": {name: "USDT", symbol: "USDT", decimals: 18, address: addresses.USDT},
      "AAVE": {name: "AAVE", symbol: "AAVE", decimals: 18, address: addresses["AAVE"]},
      "1INCH": {name: "1INCH", symbol: "1INCH", decimals: 18, address: addresses["1INCH"]},
      "SNX": {name: "SNX", symbol: "SNX", decimals: 18, address: addresses.SNX},
      "UNI": {name: "UNI", symbol: "UNI", decimals: 18, address: addresses.UNI},
      "GRT": {name: "GRT", symbol: "GRT", decimals: 18, address: addresses.GRT}
    },
    nativeToken: "AVAX",
    SLIPPAGE_TOLERANCE: 0.03
}
