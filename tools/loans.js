const config = require('./network/config-local.json');
const fs = require('fs');
const ethers = require('ethers');
const utils = ethers.utils;
const FACTORY = require('../build/contracts/SmartLoansFactory.json');
const LOAN = require('../build/contracts/SmartLoan.json');
const Web3 = require('web3');
const contract = require('truffle-contract');;
var HDWalletProvider = require("truffle-hdwallet-provider");

const mnemonic = fs.readFileSync("./.secret2").toString().trim();
let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic);




//let hdProvider = new HDWalletProvider(mnemonic, config['provider-url']);
//let provider = new ethers.providers.Web3Provider(hdProvider);
var provider;
if (config['provider-url'] === "localhost") {
  provider = new ethers.providers.JsonRpcProvider();
} else  {
  provider = new ethers.providers.JsonRpcProvider(config['provider-url'], "unspecified");
}



let wallet = mnemonicWallet.connect(provider);
let factory = new ethers.Contract(FACTORY.networks[config["network-id"]].address, FACTORY.abi, wallet);
//
const fromWei = val => parseFloat(ethers.utils.formatEther(val));
const toWei = ethers.utils.parseEther;

async function createLoan() {
  let tx = await factory.createLoan({gasLimit: 3000000});
  console.log("Loan created: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  let loanAddress = receipt.logs[0].address;
  return loanAddress;
}


async function fundLoan(loanAddress, val) {
  console.log("Funding loan: " + val);
  let loan = new ethers.Contract(loanAddress, LOAN.abi, wallet);
  let tx = await loan.fund({value: toWei(val.toString()), gasLimit: 3000000});
  console.log("Waiting for tx: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log("Funding processed with " + receipt.status == 1 ? "success" : "failure");
}


async function borrowFromPool(loanAddress, amount) {
  console.log("Borrowing funds: " + amount);
  let loan = new ethers.Contract(loanAddress, LOAN.abi, wallet);
  let tx = await loan.borrow(toWei(amount.toString()), {gasLimit: 3000000});
  console.log("Waiting for tx: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log("Borrowing processed with " + receipt.status == 1 ? "success" : "failure");
}


async function invest(loanAddress, asset, amount) {
  console.log("Investing: " + amount);
  let loan = new ethers.Contract(loanAddress, LOAN.abi, wallet);
  let tx = await loan.invest(ethers.utils.formatBytes32String(asset), toWei(amount.toString()), {gasLimit: 3000000});
  console.log("Waiting for tx: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log("Investing processed with " + receipt.status == 1 ? "success" : "failure");
}


async function findAllLoans() {
  let loans = await factory.getAllLoans();
  return loans;
}

async function getLoanStatus(loanAddress) {
  let loan = new ethers.Contract(loanAddress, LOAN.abi, wallet);
  let rawStatus = await loan.getFullLoanStatus();
  let status = {
    value : fromWei(rawStatus[0]),
    debt : fromWei(rawStatus[1]),
    solvencyRatio : parseFloat(rawStatus[2].toString()),
    isSolvent : parseInt(rawStatus[3].toString()) == 1 ? true : false
  };
  return status;
}


module.exports = {
  findAllLoans,
  getLoanStatus,
  createLoan,
  fundLoan,
  borrowFromPool,
  invest
};
