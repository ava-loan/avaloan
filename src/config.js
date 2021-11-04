import addresses from '../common/token_addresses.json';

export default {
    DEFAULT_LTV: 4,
    MAX_LTV: 5,
    chainId: 31337,
    ASSETS_CONFIG: {
      "AVAX": {name: "AVAX", symbol: "AVAX", decimals: 18},
      "ETH": {name: "Ether", symbol: "ETH", decimals: 18, address: addresses.ETH},
      "BTC": {name: "Bitcoin", symbol: "BTC", decimals: 8, address: addresses.BTC},
      "USDT": {name: "USDT", symbol: "USDT", decimals: 18, address: addresses.USDT},
      "LINK": {name: "Link", symbol: "LINK", decimals: 18, address: addresses.LINK},
      "PNG": {name: "Pangolin", symbol: "PNG", decimals: 18, address: addresses.PNG, logoExt: "jpg"},
      "XAVA": {name: "Avalaunch", symbol: "XAVA", decimals: 18, address: addresses.XAVA, logoExt: "png"},
      "FRAX": {name: "Frax", symbol: "FRAX", decimals: 18, address: addresses.FRAX}
    },
    nativeToken: "AVAX",
    SLIPPAGE_TOLERANCE: 0.03
}
