const AssetsExchange = artifacts.require("./PangolinExchange.sol");
const PriceProvider = artifacts.require("./SimplePriceProvider.sol");
const Pool = artifacts.require("./Pool.sol");
const toBytes32 = require("ethers").utils.formatBytes32String;

module.exports = function(deployer) {
  deployer.deploy(AssetsExchange, "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106").then(async function(instance) {
    await Promise.all([
      instance.updateAssetAddress(toBytes32('USD'), '0xc7198437980c041c805a1edcba50c1ce5db95118'),
      instance.updateAssetAddress(toBytes32('ETH'), '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab'),
      instance.updateAssetAddress(toBytes32('BTC'), '0x50b7545627a5162f82a992c33b87adc75187b218'),
      instance.updateAssetAddress(toBytes32('LINK'), '0x5947bb275c521040051d82396192181b413227a3')
    ]);

    deployer.deploy(PriceProvider, Pool.address, PriceProvider.address, instance.address);
  });
};
