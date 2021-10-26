import addresses from '../common/token_addresses.json';

export default {
    DEFAULT_COLLATERAL_RATIO: 1.25,
    chainId: 2137,
    ASSETS_CONFIG: {
      "AVAX": {name: "AVAX", symbol: "AVAX", code: "avalanche-2", decimals: 18},
      "ETH": {name: "Ether", symbol: "ETH", code: "ethereum", decimals: 18, address: addresses.ETH},
      "BTC": {name: "Bitcoin", symbol: "BTC", code: "bitcoin", decimals: 8, address: addresses.BTC},
      "LINK": {name: "Link", symbol: "LINK",  code: "link", decimals: 18, address: addresses.LINK}
    },
    nativeToken: "AVAX",
    SLIPPAGE_CHANGE_TOLERANCE: 0.05
}
