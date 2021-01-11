const CoinGecko = require('coingecko-api');
const PriceOracle = require('../price-oracle.js');

const CoinGeckoClient = new CoinGecko();

async function fetchPrice(tokens) {
  console.log("Fetching: " + tokens + " latest price");
  let response = await CoinGeckoClient.simple.price({
    ids: tokens,
    vs_currencies: "usd"
  });
  console.log(response);
  return response.data;
};

async function setMarketPrice() {
  let prices = await fetchPrice(['avalanche-2', 'ethereum', 'bitcoin', 'ripple', 'chainlink']);
  await PriceOracle.setPrice('BTC', prices['bitcoin'].usd/prices['avalanche-2'].usd);
  await PriceOracle.setPrice('ETH', prices['ethereum'].usd/prices['avalanche-2'].usd);
  await PriceOracle.setPrice('XRP', prices['ripple'].usd/prices['avalanche-2'].usd);
  await PriceOracle.setPrice('LNK', prices['chainlink'].usd/prices['avalanche-2'].usd);
  setTimeout(setMarketPrice, 600000);
}

setMarketPrice();
