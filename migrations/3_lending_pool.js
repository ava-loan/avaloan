const Pool = artifacts.require("./Pool.sol");
const Calculator = artifacts.require("./UtilisationRatesCalculator.sol");

module.exports = function(deployer) {
  deployer.deploy(Pool).then(function(instance) {
    console.log("Setting rates calculator to: " + Calculator.address);
    instance.setRatesCalculator(Calculator.address, {gas:300000});
  });
};
