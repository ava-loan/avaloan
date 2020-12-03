const {expect} = require('chai');
const {expectRevert} = require('@openzeppelin/test-helpers');

const SimplePriceProvider = artifacts.require('SimplePriceProvider');

const toWei = web3.utils.toWei;
const fromWei = (val) => parseFloat(web3.utils.fromWei(val));
const toBytes32 = web3.utils.fromAscii;

contract('SimplePriceProvider', function ([owner, oracle]) {

  describe('Set and read price', function () {

    var provider;

    before("deploy the Provider", async function () {
      provider = await SimplePriceProvider.new();

    });

    it("should set the oracle", async function () {
      await provider.setOracle(oracle);
    });

    it("should  allow to set the price only for oracle", async function () {
      await expectRevert(
        provider.setPrice(toBytes32('USD'), toWei("0.5")),
        "SimplePriceProvider: caller is not the oracle"
      );

    });

    it("should set single price", async function () {
      await provider.setPrice(toBytes32('USD'), toWei("0.5"), {from: oracle});
      let price = fromWei(await provider.getPrice(toBytes32('USD')));
      expect(price).to.be.closeTo(0.5, 0.000001);
    });

    it("should set multiple prices", async function () {
      await provider.setPrice(toBytes32('ETH'), toWei("0.1"), {from: oracle});
      await provider.setPrice(toBytes32('BTC'), toWei("0.01"), {from: oracle});

      let ethPrice = fromWei(await provider.getPrice(toBytes32('ETH')));
      let btcPrice = fromWei(await provider.getPrice(toBytes32('BTC')));

      expect(ethPrice).to.be.closeTo(0.1, 0.000001);
      expect(btcPrice).to.be.closeTo(0.01, 0.000001);
    });




  });

});

