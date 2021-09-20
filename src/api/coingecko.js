const CoinGecko = require('coingecko-api');
const CoinGeckoClient = new CoinGecko();

export async function getAssetPriceHistory(asset) {
    const historyResponse = await CoinGeckoClient.coins.fetchMarketChart(asset, {days: 7});
    return historyResponse.data.prices;
}

export async function getAvaxPrice() {
    let response = await CoinGeckoClient.simple.price({
        ids: 'avalanche-2',
        vs_currencies: "usd"
    });
    
    return response.data['avalanche-2'].usd;
}
