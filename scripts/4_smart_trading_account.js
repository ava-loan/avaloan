var SmartTradingAccount = artifacts.require("./SmartTradingAccount.sol");


module.exports = function(deployer) {
  deployer.deploy(SmartTradingAccount, "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f", "0xee38902aFDA193c8d4EDA7F0216f645AD9350402")
    .then(function(instance) {
      return instance.setResolverAndSyncCache("0xee38902aFDA193c8d4EDA7F0216f645AD9350402");
    });
};
