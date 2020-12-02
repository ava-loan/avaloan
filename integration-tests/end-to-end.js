const fs = require('fs');
const ethers = require('ethers');
const utils = ethers.utils;
const FACTORY = require('../build/contracts/SmartLoansFactory.json');
const SMART_TRADING_ACCOUNT = require('../build/contracts/SmartLoan.json');
const LENDING_POOL = require('../build/contracts/LendingPool.json');

const S_USD = utils.formatBytes32String('sUSD');
const S_BTC = utils.formatBytes32String('sBTC');

const mnemonic = fs.readFileSync("../.secret").toString().trim();

let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic);
let provider = ethers.getDefaultProvider('kovan');
let wallet = mnemonicWallet.connect(provider);


let factory = new ethers.Contract(FACTORY.networks["42"].address, FACTORY.abi, wallet);
let pool = new ethers.Contract(LENDING_POOL.networks["42"].address, LENDING_POOL.abi, wallet);

var sta;

async function deposit() {
  let tx = await pool.deposit({gasLimit: 1000000, value: utils.parseEther('0.1')});
  console.log("Deposited: " + tx.hash);
}

async function create() {
  let tx = await factory.createLoan({gasLimit: 3000000});
  //factory.createAccount().then(function(res){}).catch(function(err){console.log(err)});
  console.log("Created: " + tx.hash);
}

async function createAndFund() {
  let tx = await factory.createAndFundLoan(utils.parseEther('1'), {gasLimit: 5000000, value: utils.parseEther('0.01')});
  //factory.createAccount().then(function(res){}).catch(function(err){console.log(err)});
  console.log(tx);
}

async function linkSta() {
  let mySta = await factory.creatorsToAccounts(wallet.address);
  console.log("My sta: " + mySta);
  sta = new ethers.Contract(mySta, SMART_TRADING_ACCOUNT.abi, wallet);
}

async function borrow() {
  let tx = await sta.borrow(utils.parseEther('10'), {gasLimit: 1000000});
  console.log(tx);
}

async function repay() {
  let tx = await sta.repay(utils.parseEther('1'), {gasLimit: 1000000});
  console.log(tx);
}

async function fund() {
  let tx = await sta.fund({gasLimit: 1000000, value: utils.parseEther('0.01')});
  console.log("Funded account: " + tx.hash);
}

async function withdraw() {
  let tx = await sta.withdraw(utils.parseEther('1'));
  console.log("Withdraw: " + tx.hash);
}

//https://kovan.etherscan.io/tx/0xa8783c9044f4bafaed289a19761b1700346ebeabfa01382bcb20fea5df5c34ad
async function liquidate() {
  let tx = await sta.liquidate(utils.parseEther('5'));
  console.log("Liquidation: " + tx.hash);
}


async function getAccountStats() {
  let total = await sta.getAccountValue();
  console.log("Account value: " + ethers.utils.formatEther(total));

  let balances = await sta.getAllAssetsBalances();
  console.log("Balances:");
  console.log(balances);

  let prices = await sta.getAllAssetsPrices();
  console.log("Prices:");
  console.log(prices);

  let debt = await sta.getMyDebt();
  console.log("Account debt: " + ethers.utils.formatEther(debt));

  let solvency = await sta.getSolvencyRatio();
  console.log("Account solvency: " + solvency.toString());

  let isSolvent = await sta.isSolvent();
  console.log("Account is solvent: " + isSolvent);

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



async function check() {
  //await deposit();
  //await createAndFund();
  await linkSta();
  //await withdraw();
  //await fund();
  //await borrow();
  //await repay();
  //await liquidate();
  await getAccountStats();

}

check();
