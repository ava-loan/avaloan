const {promisify} = require("es6-promisify");
const ethers = require('ethers');
let ethereum = window.ethereum;
const Web3 = require('web3');

var web3, main, provider;

export async function getWeb3() {
  console.log("Getting web3");
  window.ethers = ethers;
  if (web3) {
    return web3;
  }

  if (typeof ethereum !== 'undefined') {
    await ethereum.enable();
    web3 = new Web3(ethereum);
    window.web3 = web3;
  } else if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
  } else {
    throw 'NO_WEB3'
  }

  return web3;
};

export async function getProvider() {
  if (!provider) {
    let web3 = await getWeb3();
    provider = new ethers.providers.Web3Provider(web3.currentProvider);
  }
  window.provider = provider;
  return provider;
}

export async function getMainAccount() {
  if (main) {
    return main;
  }
  let provider = await getProvider();
  let accounts = await provider.listAccounts();
  if (accounts.length > 0) {
    main = accounts[0];
    console.log("Connected web3 account: " + main);
  } else {
    console.log("No web3 accounts available.")
  }
  return main;
}




