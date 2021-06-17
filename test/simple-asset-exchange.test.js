const {expect} = require('chai');
const {expectRevert} = require('@openzeppelin/test-helpers');

const SimplePriceProvider = artifacts.require('SimplePriceProvider');
const SimpleAssetsExchange = artifacts.require('SimpleAssetsExchange');

const toWei = web3.utils.toWei;
const fromWei = (val) => parseFloat(web3.utils.fromWei(val));
const toBytes32 = web3.utils.fromAscii;

contract('SimpleAssetsExchange', function ([owner, oracle]) {

  describe('Buy and sell asset', function () {

    var provider, exchange;

    before("deploy the Exchange", async function () {
      exchange = await SimpleAssetsExchange.new();
    });

    it("should set the price provider", async function () {
      provider = await SimplePriceProvider.new();
      await provider.setOracle(oracle);
      await exchange.setPriceProvider(provider.address)
    });


    it("should check if there is enough funds for purchase", async function () {
      await provider.setPrice(toBytes32('USD'), toWei("0.5"), {from: oracle});
      await expectRevert(
        exchange.buyAsset(toBytes32('USD'), toWei("100"), {value: toWei("49")}),
        "Not enough funds provided"
      );
    });

    it("should buy asset", async function () {
      await provider.setPrice(toBytes32('USD'), toWei("0.5"), {from: oracle});
      await exchange.buyAsset(toBytes32('USD'), toWei("100"), {value: toWei("50")});

      let balance = fromWei(await exchange.getBalance(owner, toBytes32('USD')));
      expect(balance).to.be.equal(100);

      expect(fromWei(await web3.eth.getBalance(exchange.address))).to.be.equal(50);
    });

    it("should not allow selling more than owned", async function () {
      await expectRevert(
        exchange.sellAsset(toBytes32('USD'), toWei("101")),
        "Not enough assets to sell"
      );
    });


    it("should sell part of asset", async function () {
      await exchange.sellAsset(toBytes32('USD'), toWei("50"));

      let balance = fromWei(await exchange.getBalance(owner, toBytes32('USD')));
      expect(balance).to.be.equal(50);

      expect(fromWei(await web3.eth.getBalance(exchange.address))).to.be.equal(25);
    });

    it("should sell rest of asset", async function () {
      await exchange.sellAsset(toBytes32('USD'), toWei("50"));

      let balance = fromWei(await exchange.getBalance(owner, toBytes32('USD')));
      expect(balance).to.be.equal(0);

      expect(fromWei(await web3.eth.getBalance(exchange.address))).to.be.equal(0);
    });

  });

});

