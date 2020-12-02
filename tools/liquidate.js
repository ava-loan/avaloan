const fs = require('fs');
const ethers = require('ethers');
const utils = ethers.utils;
const FACTORY = require('../build/contracts/SmartLoansFactory.json');
const SMART_LOAN = require('../build/contracts/SmartLoan.json');


const mnemonic = fs.readFileSync("../.secret").toString().trim();

let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic);
let provider = ethers.getDefaultProvider('kovan');
let wallet = mnemonicWallet.connect(provider);


let factory = new ethers.Contract(FACTORY.networks["42"].address, FACTORY.abi, wallet);


async function liquidate(owner, amount) {
  console.log("Liquidating loan owned by: " + owner + " trying to repay: " + amount + " usd");
  let loanAddress = await factory.creatorsToAccounts(owner);
  console.log("Smart loan address: " + loanAddress);
  let loan = new ethers.Contract(loanAddress, SMART_LOAN.abi, wallet);
  let tx = await loan.liquidate(utils.parseEther(amount), {gasLimit: 2000000});
  console.log("Liquidation tx: " + tx.hash);
}

async function execute() {
  await liquidate(process.argv[2], process.argv[3]);
}

execute();
