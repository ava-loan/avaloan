const ZERO = require("ethers").constants.AddressZero;

const AssetsExchange = artifacts.require("./PangolinExchange.sol");
const SupportedAssets = artifacts.require("./SupportedAssets.sol");
const UtilisationRatesCalculator = artifacts.require("./UtilisationRatesCalculator.sol");
const Pool = artifacts.require("./Pool.sol");
const SmartLoansFactory = artifacts.require("./SmartLoansFactory.sol");

const PRICE_SIGNER = "0xf786a909D559F5Dee2dc6706d8e5A81728a39aE9"; //redstone-rapid

module.exports = function(deployer) {
  var factory;
  deployer.deploy(SmartLoansFactory, Pool.address, SupportedAssets.address, AssetsExchange.address, PRICE_SIGNER)
    .then(function(instance) {
      factory = instance;
      console.log("Smart Loan factory deployed: " + factory.address);
      return Pool.deployed();
    }).then(function(pool) {
     console.log("Initializing pool: " + pool.address);
     return pool.initialize(UtilisationRatesCalculator.address, factory.address, ZERO, ZERO, {gas:6000000});
  })

};
