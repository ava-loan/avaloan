import POOL from '@contracts/Pool.json'

import { getProvider, getMainAccount } from "./network.js"
import state from "@/state";

const ethers = require('ethers');
const utils = ethers.utils;

var cachedPool;

async function getPool() {
  if (!cachedPool) {
    let provider = await getProvider();
    cachedPool = new ethers.Contract(POOL.networks["42"].address, POOL.abi, provider.getSigner());
    cachedPool.iface = new ethers.utils.Interface(POOL.abi);
    console.log("Connected to the pool: " + cachedPool.address);
  }
  return cachedPool;
}

export async function getMyDeposits() {
  let pool = await getPool();
  let main = await getMainAccount();

  let poolDepositorBalance = await pool.getDeposits(main);
  state.pool.myDeposits  = parseFloat(ethers.utils.formatEther(poolDepositorBalance));
  console.log("User pool deposits: " + state.pool.myDeposits);

  let totalDeposited = 0;
  let totalWithdrawn = 0;

  let provider = await getProvider();
  let logs = await provider.getLogs({
    fromBlock: 0,
    toBlock: 'latest',
    address: pool.address});
  let events = logs.map(log => {
    console.log(log);
    let parsed = pool.iface.parseLog(log);
    let event = {
      type: parsed.name,
      time: new Date(parseInt(parsed.values.time.toString())*1000),
      value: parseFloat(ethers.utils.formatEther(parsed.values.value)),
      tx: log.transactionHash
    };
    if (event.type === 'Deposit') totalDeposited += event.value;
    if (event.type === 'Withdrawal') totalWithdrawn += event.value;
    return event;
  });

  state.pool.depositInterests = state.pool.myDeposits - totalDeposited + totalWithdrawn;

  console.log("T deposited: " + totalDeposited);
  console.log("T withdrawn: " + totalWithdrawn);
  console.log("Interests: " + state.pool.depositInterests);


  events = Array.sort(events, (a,b) => b.time - a.time);
  console.log(events);
  state.pool.history.length = 0;
  state.pool.history = state.pool.history.concat(events);


}

export async function getMyLoans() {
  let pool = await getPool();
  let main = await getMainAccount();

  let balance = await pool.getBorrowed(main);
  state.pool.myBorrowed = parseFloat(ethers.utils.formatEther(balance));
  console.log("User pool loans: " + state.pool.myBorrowed);
}

export async function getPoolStats() {
  let pool = await getPool();
  let main = await getMainAccount();

  let poolDepositorBalance = await pool.getDeposits(main);
  state.pool.myDeposits = parseFloat(ethers.utils.formatEther(poolDepositorBalance));

  //Pool stats
  state.pool.totalDeposited = parseFloat(ethers.utils.formatEther(await pool.totalDeposited()));
  state.pool.totalBorrowed = parseFloat(ethers.utils.formatEther(await pool.totalBorrowed()));
  state.pool.depositRate = parseFloat(ethers.utils.formatEther(await pool.getDepositRate()));
  state.pool.borrowingRate = parseFloat(ethers.utils.formatEther(await pool.getBorrowingRate()));

  console.log("Pool total deposited: " + state.pool.myDeposits);



}

export async function sendDeposit(amount) {
  console.log("Depositing: " + amount);
  let provider = await getProvider();
  let pool = await getPool();
  let tx = await pool.deposit({gasLimit: 300000, value: utils.parseEther(amount)});
  console.log("Deposited: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log(receipt);
  await getMyDeposits();
  await getPoolStats();
}

export async function withdraw(amount) {
  console.log("Withdrawing: " + amount);

  let provider = await getProvider();
  let pool = await getPool();
  let tx = await pool.withdraw(utils.parseEther(amount.toString()), {gasLimit: 500000});
  console.log("Withdrawn: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log(receipt);
  await getMyDeposits();
  await getPoolStats();
}

export async function borrow(amount) {
  console.log("Borrowing: " + amount);
  let provider = await getProvider();
  let pool = await getPool();
  let tx = await pool.borrow(utils.parseEther(amount), {gasLimit: 300000});
  console.log("Borrowed: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log(receipt);
  await getMyLoans();
  await getPoolStats();
}

export async function repay(amount) {
  console.log("Repaying: " + amount);
  let provider = await getProvider();
  let pool = await getPool();
  let tx = await pool.repay({gasLimit: 300000, value: utils.parseEther(amount.toString())});
  console.log("Repaid: " + tx.hash);
  let receipt = await provider.waitForTransaction(tx.hash);
  console.log(receipt);
  await getMyLoans();
  await getPoolStats();
}

