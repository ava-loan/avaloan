const fs = require('fs');
const ethers = require('ethers');
const utils = ethers.utils;
const FACTORY = require('../build/contracts/SmartTradingAccountsFactory.json');

const mnemonic = fs.readFileSync("../.secret").toString().trim();

let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic);
let provider = ethers.getDefaultProvider('kovan');
let wallet = mnemonicWallet.connect(provider);


let factory = new ethers.Contract(FACTORY.networks["42"].address, FACTORY.abi, wallet);


async function create() {
  let tx = await factory.createAccount({gasLimit: 3000000});
  //factory.createAccount().then(function(res){}).catch(function(err){console.log(err)});
  console.log("Account created: " + tx.hash);
  console.log(tx);
}



async function check() {
  await create();
}

check();
