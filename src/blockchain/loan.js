import LOAN_FACTORY from '@contracts/SmartLoansFactory.json'
import LOAN from '@contracts/SmartLoan.json'
import { getProvider, getMainAccount } from "./network.js"
import state from "@/state";

const ethers = require('ethers');
const CoinGecko = require('coingecko-api');
const CoinGeckoClient = new CoinGecko();

const ZERO = "0x0000000000000000000000000000000000000000";
const DEFAULT_COLLATERAL_RATIO = 1.25;

const fromWei = val => parseFloat(ethers.utils.formatEther(val));
const toWei = ethers.utils.parseEther;

var cachedLoan;

export async function getLoan() {
  if (!cachedLoan) {
    let provider = await getProvider();
    let main = await getMainAccount();

    let loanFactory = new ethers.Contract(LOAN_FACTORY.networks[state.NETWORK_ID].address, LOAN_FACTORY.abi, provider.getSigner());
    let myLoan = await loanFactory.getAccountForUser(main);

    state.loan.isCreated = myLoan != ZERO;
    if (state.loan.isCreated) {
      cachedLoan = new ethers.Contract(myLoan, LOAN.abi, provider.getSigner());
      console.log("Loan linked: " + cachedLoan.address);
      await getLoanStats();
      await getAssets();
    }

  }
  return cachedLoan;
}

export async function getLoanStats() {
  let loan = await getLoan();
  let status = await loan.getFullLoanStatus();
  state.loan.totalValue = fromWei(status[0]);
  state.loan.debt = fromWei(status[1]);
  state.loan.solvency = status[2]/1000;
  console.log(state.loan.debt);
}

export async function getAssets() {
  let provider = await getProvider();
  let loan = await getLoan();

  let prices = await loan.getAllAssetsPrices();
  let balances = await loan.getAllAssetsBalances();

  for(var i=0; i<prices.length;i++) {
    if (i == 0) {
      state.loan.assets[0].balance = fromWei(await provider.getBalance(loan.address));
      state.loan.assets[0].price = 1;
    } else {
      state.loan.assets[i].price = fromWei(prices[i]);
      state.loan.assets[i].balance = fromWei(balances[i]);
    }

    state.loan.assets[i].value = state.loan.assets[i].balance * state.loan.assets[i].price;
    state.loan.assets[i].share = state.loan.assets[i].value / state.loan.totalValue;
  }

}


export async function createNewLoan(amount) {
    let provider = await getProvider();

    let collateral = calculateCollateral(amount);
    let loanFactory = new ethers.Contract(LOAN_FACTORY.networks[state.NETWORK_ID].address, LOAN_FACTORY.abi, provider.getSigner());
    let tx = await loanFactory.createAndFundLoan(toWei(amount.toString()), {value: toWei(collateral.toString()), gasLimit: 3000000});

    console.log("Loan created: " + tx.hash);
    let receipt = await provider.waitForTransaction(tx.hash);
    console.log(receipt);
    await getLoan();
}

export async function borrow(amount) {
  let provider = await getProvider();
  let loan = await getLoan();

  let tx = await loan.borrow(toWei(amount.toString()), {gasLimit: 3000000});
  console.log("Funds borrowed: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log(receipt);
  await getLoanStats();
}

export async function repay(amount) {
  let provider = await getProvider();
  let loan = await getLoan();

  let tx = await loan.repay(toWei(amount.toString()), {gasLimit: 3000000});
  console.log("Funds repaid: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log(receipt);
  await getLoanStats();
}

export async function fund(amount) {
  let provider = await getProvider();
  let loan = await getLoan();

  let tx = await loan.fund({value: toWei(amount.toString()), gasLimit: 3000000});
  console.log("Funds added: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log(receipt);
  await getLoanStats();
}

export async function withdraw(amount) {
  let provider = await getProvider();
  let loan = await getLoan();

  let tx = await loan.withdraw(toWei(amount.toString()), {gasLimit: 3000000});
  console.log("Funds withdrawn: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log(receipt);
  await getLoanStats();
}

export function calculateCollateral(amount) {
  if (amount) {
    return DEFAULT_COLLATERAL_RATIO*amount -amount;
  }
}

export async function invest(asset, amount) {
  console.log(`Investing ${amount} into ${asset}`);
  let provider = await getProvider();
  let loan = await getLoan();

  let tx = await loan.invest(ethers.utils.formatBytes32String(asset), toWei(amount.toString()), {gasLimit: 3000000});
  console.log("Invested: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log(receipt);
  await getLoanStats();
  await getAssets();
}

export async function getAssetPriceHistory(asset) {
  let historyResponse = await CoinGeckoClient.coins.fetchMarketChart(asset, {days: 7});
  return historyResponse.data.prices
}


