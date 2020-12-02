var SmartLoansFactory = artifacts.require("./SmartLoansFactory.sol");
var LendingPool = artifacts.require("./LendingPool.sol");


module.exports = function(deployer) {
  deployer.deploy(SmartLoansFactory,
    "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
    "0xee38902aFDA193c8d4EDA7F0216f645AD9350402",
    LendingPool.address,
    1200
  ).then(function () {
    return LendingPool.deployed();
  }).then(function(lendingPool) {
    lendingPool.setborrowersRegistry(SmartLoansFactory.address);
  });
};
