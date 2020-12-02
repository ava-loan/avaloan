var LendingPool = artifacts.require("./LendingPool.sol");

const ethers = require('ethers');
const utils = ethers.utils;

module.exports = function(deployer) {
  deployer.deploy(LendingPool,
    utils.formatBytes32String('sUSD'),
    "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f", //Synthetix
    "0xee38902aFDA193c8d4EDA7F0216f645AD9350402" //Resolver
    )
};
