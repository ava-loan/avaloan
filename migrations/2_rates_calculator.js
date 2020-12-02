var UtilisationRatesCalculator = artifacts.require("./UtilisationRatesCalculator.sol");

const toWei = web3.utils.toWei;

module.exports = function(deployer) {
  deployer.deploy(UtilisationRatesCalculator, toWei("0.5"), toWei("0.05"));
};
