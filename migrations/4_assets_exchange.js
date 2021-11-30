const addresses = require("../common/token_addresses.json");
const toBytes32 = require("ethers").utils.formatBytes32String;
const AssetsExchange = artifacts.require("./PangolinExchange.sol");

module.exports = function(deployer) {
  deployer.deploy(AssetsExchange, "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106")
    .then(async function(instance) {
      await Promise.all([
        instance.setAsset(toBytes32('ETH'), addresses["ETH"]),
        instance.setAsset(toBytes32('BTC'), addresses["BTC"]),
        instance.setAsset(toBytes32('USDT'), addresses["USDT"]),
        instance.setAsset(toBytes32('LINK'), addresses["LINK"]),
        instance.setAsset(toBytes32('PNG'), addresses["PNG"]),
        instance.setAsset(toBytes32('XAVA'), addresses["XAVA"]),
        instance.setAsset(toBytes32('FRAX'), addresses["FRAX"])
      ]);
    });
};
