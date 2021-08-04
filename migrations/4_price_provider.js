const PriceProvider = artifacts.require("./SimplePriceProvider.sol");

module.exports = function(deployer, network, addresses) {
  let oracle = addresses[0];
  deployer.deploy(PriceProvider).then(function(instance) {
    console.log("Setting oracle to: " + oracle);
    instance.setOracle(oracle, {gas:300000});
  });
};
