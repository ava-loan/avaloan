const {promisify} = require("es6-promisify");
const ethers = require('ethers');
let ethereum = window.ethereum;
const detectNetwork = require('web3-detect-network');

var web3, main, provider;

export async function getWeb3() {
  window.ethers = ethers;
  if (web3) {
    return web3;
  }

  if (typeof ethereum !== 'undefined') {
    await ethereum.enable();
    web3 = new Web3(ethereum);
  } else if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
  } else {
    throw 'NO_WEB3'
  }
  let network = await detectNetwork(web3.currentProvider);

  console.log("Connected to network: " + network.id);

  return web3;
};

export async function getProvider() {
  if (!provider) {
    let web3 = await getWeb3();
    provider = new ethers.providers.Web3Provider(web3.currentProvider);
  }
  return provider;
}

export async function getMainAccount() {
  if (main) {
    return main;
  }
  await getWeb3();
  let getAccounts = promisify(web3.eth.getAccounts);
  let accounts = await getAccounts();
  if (accounts.length > 0) {
    main = accounts[0];
    console.log("Connected web3 account: " + main);
  } else {
    console.log("No web3 accounts available.")
  }
  return main;
}




