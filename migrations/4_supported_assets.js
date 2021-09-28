const SupportedAssets = artifacts.require("./SupportedAssets.sol");
const toBytes32 = require("ethers").utils.formatBytes32String;

module.exports = function(deployer) {
  deployer.deploy(SupportedAssets).then(async function(instance) {
    await Promise.all([
      instance.setAsset(toBytes32('USD'), '0xc7198437980c041c805a1edcba50c1ce5db95118'),
      instance.setAsset(toBytes32('ETH'), '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab'),
      instance.setAsset(toBytes32('BTC'), '0x50b7545627a5162f82a992c33b87adc75187b218'),
      instance.setAsset(toBytes32('LINK'), '0x5947bb275c521040051d82396192181b413227a3')
    ]);
  });
};
