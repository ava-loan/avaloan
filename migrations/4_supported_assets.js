const SupportedAssets = artifacts.require("./SupportedAssets.sol");
const toBytes32 = require("ethers").utils.formatBytes32String;
const addresses = require("../common/token_addresses.json");

module.exports = function(deployer) {
  deployer.deploy(SupportedAssets).then(async function(instance) {
    await Promise.all([
      instance.setAsset(toBytes32('ETH'), addresses["ETH"]),
      instance.setAsset(toBytes32('BTC'), addresses["BTC"]),
      instance.setAsset(toBytes32('LINK'), addresses["LINK"]),
      instance.setAsset(toBytes32('USDT'), addresses["USDT"]),
      instance.setAsset(toBytes32('1INCH'), addresses["1INCH"]),
      instance.setAsset(toBytes32('AAVE'), addresses["AAVE"]),
      instance.setAsset(toBytes32('SNX'), addresses["SNX"]),
      instance.setAsset(toBytes32('UNI'), addresses["UNI"]),
      instance.setAsset(toBytes32('GRT'), addresses["GRT"]),
    ]);
  });
};
