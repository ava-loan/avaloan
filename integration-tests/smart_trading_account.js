const fs = require('fs');
const ethers = require('ethers');
const utils = ethers.utils;
const SMART_TRADING_ACCOUNT = require('../build/contracts/SmartTradingAccount.json');
const SYNTH = require('../build/contracts/Synth.json');
const FACTORY = require('../build/contracts/SmartTradingAccountsFactory.json');

const SUSD_ADDRESS = "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51";

const S_USD = utils.formatBytes32String('sUSD');
const S_BTC = utils.formatBytes32String('sBTC');

const mnemonic = fs.readFileSync("../.secret").toString().trim();

let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic);
let provider = ethers.getDefaultProvider('kovan');
let wallet = mnemonicWallet.connect(provider);


let factory = new ethers.Contract(FACTORY.networks["42"].address, FACTORY.abi, wallet);
let susd = new ethers.Contract(SUSD_ADDRESS, SYNTH.abi, wallet);
var sta;// = new ethers.Contract(SMART_TRADING_ACCOUNT.networks["42"].address, SMART_TRADING_ACCOUNT.abi, wallet);

async function linkSta() {
  let mySta = await factory.creatorsToAccounts(wallet.address);
  console.log("My sta: " + mySta);
  sta = new ethers.Contract(mySta, SMART_TRADING_ACCOUNT.abi, wallet);
}

async function fund() {
  let tx = await sta.fund({gasLimit: 1000000, value: utils.parseEther('0.01')});
  console.log("Funded account: " + tx.hash);
}

async function getValue() {
  let total = await sta.getAccountValue();
  console.log("Account value: " + ethers.utils.formatEther(total));

  let sUsdBalance = await sta.getAssetBalance(S_USD);
  console.log("sUsd balance: " + ethers.utils.formatEther(sUsdBalance));

  let sUsdPrice = await sta.getAssetPrice(S_USD);
  console.log("sUsd price: " + ethers.utils.formatEther(sUsdPrice));

  let sUsdValue = await sta.getAssetValue(S_USD);
  console.log("sUsd value: " + ethers.utils.formatEther(sUsdValue));

  let sBTCBalance = await sta.getAssetBalance(S_BTC);
  console.log("sBTC balance: " + ethers.utils.formatEther(sBTCBalance));

  let sBTCPrice = await sta.getAssetPrice(S_BTC);
  console.log("sBTC price: " + ethers.utils.formatEther(sBTCPrice));

  let sBTCValue = await sta.getAssetValue(S_BTC);
  console.log("sBTC value: " + ethers.utils.formatEther(sBTCValue));
}

async function trade() {
  let tx = await sta.trade(S_USD, utils.parseEther('1'), S_BTC);
  console.log("Trade: " + tx.hash);
}


async function check() {
  await linkSta();
  //await fund();
  await getValue();
  //await trade();
  //await getValue();

}

check();
