const AssetsExchange = artifacts.require("./SimpleAssetsExchange.sol");
const PriceProvider = artifacts.require("./SimplePriceProvider.sol");

module.exports = function(deployer) {
  deployer.deploy(AssetsExchange).then(function(instance) {
    console.log("Setting price provider to: " + PriceProvider.address);
    instance.setPriceProvider(PriceProvider.address, {gas:300000});
  });
};
