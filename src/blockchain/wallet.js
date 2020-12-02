import { getMainAccount } from "./network.js";
import state from "@/state";
import {getWeb3} from "./network";

export async function getWalletBalance() {
  let main = await getMainAccount();
  //state.balance.tokens = parseInt(web3.fromWei(await ausd.balanceOf(main), 'ether'));
}

async function getEthBalance() {
  let main = await getMainAccount();
  let web3 = await getWeb3();
  return new Promise((resolve, reject) => {
    web3.eth.getBalance(main, function(e,result) {
      state.currencies.eth.balance = parseFloat(web3.fromWei(result, 'ether'));
      console.log("Eth balance: " + state.currencies.eth.balance);
      resolve(state.currencies.eth.balance);
    })
  });
}

export async function getBalances() {
  await getEthBalance();
}
