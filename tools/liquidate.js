const config = require('./network/config-local.json');
const fs = require('fs');
const ethers = require('ethers');
const LOAN = require('../build/contracts/SmartLoan.json');
const {WrapperBuilder} = require("redstone-flash-storage");


const privateKey = fs.readFileSync("./.secret2").toString().trim();
let mnemonicWallet = new ethers.Wallet(privateKey);

var provider;
if (config['provider-url'] === "localhost") {
  provider = new ethers.providers.JsonRpcProvider();
} else {
  provider = new ethers.providers.JsonRpcProvider(config['provider-url'], "unspecified");
}


let wallet = mnemonicWallet.connect(provider);

const fromWei = val => parseFloat(ethers.utils.formatEther(val));
const toWei = ethers.utils.parseEther;


async function liquidate(loanAddress, amount) {
  console.log(`Liquidating loan ${loanAddress} with amount: ${amount}`);
  let loan = new ethers.Contract(loanAddress, LOAN.abi, wallet);
  loan = WrapperBuilder
    .wrapLite(loan)
    .usingPriceFeed("redstone-rapid");
  let tx = await loan.liquidate(toWei(amount.toString()), {gasLimit: 3000000});
  console.log("Waiting for tx: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log("Liquidation processed with " + receipt.status == 1 ? "success" : "failure");
}


async function calculateLiquidationAmount(loanAddress) {
  let loan = new ethers.Contract(loanAddress, LOAN.abi, wallet);
  loan = WrapperBuilder
    .wrapLite(loan)
    .usingPriceFeed("redstone-rapid");
  let rawStatus = await loan.getFullLoanStatus();
  let rawSolvency = await loan.minSolvencyRatio();

  let total = fromWei(rawStatus[0]);
  let debt = fromWei(rawStatus[1]);
  let solvency = parseFloat(rawSolvency) / 1000;
  let bonus = 0.1;

  let liqudation = (total - solvency * debt) / (1 + bonus - solvency) * 1.01;
  console.log("Optimal liquidation: " + liqudation);
  return liqudation;
}


module.exports = {
  liquidate,
  calculateLiquidationAmount
};
