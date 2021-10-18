const AssetsExchange = artifacts.require("./PangolinExchange.sol");
const SupportedAssets = artifacts.require("./SupportedAssets.sol");

module.exports = function(deployer) {
  deployer.deploy(AssetsExchange, "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106", SupportedAssets.address);
};
