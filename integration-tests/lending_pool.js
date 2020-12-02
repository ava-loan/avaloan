const fs = require('fs');
const ethers = require('ethers');
const utils = ethers.utils;
const LENDING_POOL = require('../build/contracts/LendingPool.json');
const SYNTH = require('../build/contracts/Synth.json');

const SUSD_ADDRESS = "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51";

const S_USD = utils.formatBytes32String('sUSD');
const S_BTC = utils.formatBytes32String('sBTC');

const mnemonic = fs.readFileSync("../.secret").toString().trim();

let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic);
let provider = ethers.getDefaultProvider('kovan');
let wallet = mnemonicWallet.connect(provider);


let pool = new ethers.Contract(LENDING_POOL.networks["42"].address, LENDING_POOL.abi, wallet);
let susd = new ethers.Contract(SUSD_ADDRESS, SYNTH.abi, wallet);

async function deposit() {
  let tx = await pool.deposit({gasLimit: 1000000, value: utils.parseEther('0.01')});
  console.log("Deposited: " + tx.hash);
}

async function withdraw() {
  let tx = await pool.withdraw(utils.parseEther('2'));
  console.log("Withdrawn: " + tx.hash);
}

async function getStats() {


  let poolExternalBalance = await susd.balanceOf(pool.address);
  console.log("Pool external balance: " + ethers.utils.formatEther(poolExternalBalance));

  let poolDepositorBalance = await pool.getDepositedBy(wallet.address);
  console.log("Pool depositor balance: " + ethers.utils.formatEther(poolDepositorBalance));

  let available = await pool.getAvailableToBorrow();
  console.log("Available to borrow: " + ethers.utils.formatEther(available));

  let poolBorrowerBalance = await pool.getBorrowedBy(wallet.address);
  console.log("Pool borrower balance: " + ethers.utils.formatEther(poolBorrowerBalance));
  //
  // let sBTCPrice = await sta.getAssetPrice(S_BTC);
  // console.log("sBTC price: " + ethers.utils.formatEther(sBTCPrice));
  //
  // let sBTCValue = await sta.getAssetValue(S_BTC);
  // console.log("sBTC value: " + ethers.utils.formatEther(sBTCValue));
}

async function borrow() {
  let tx = await pool.borrow(utils.parseEther('1'));
  console.log("Borrow: " + tx.hash);
}


async function check() {
  //await deposit();
  //await borrow();
  //await withdraw();
  await getStats();
  //await trade();
  //await getValue();

}

check();
