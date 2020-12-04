const {expect} = require('chai');
const {expectRevert} = require('@openzeppelin/test-helpers');

const SimplePriceProvider = artifacts.require('SimplePriceProvider');
const SimpleAssetExchange = artifacts.require('SimpleAssetExchange');
const SmartLoan = artifacts.require('SmartLoan');

const toWei = web3.utils.toWei;
const fromWei = (val) => parseFloat(web3.utils.fromWei(val));
const toBytes32 = web3.utils.fromAscii;

contract('Smart loan', function ([owner, oracle]) {

  describe('A loan without debt', function () {

    var provider, exchange, loan;

    before("deploy the Smart Loan", async function () {
      provider = await SimplePriceProvider.new();
      await provider.setOracle(oracle);

      exchange = await SimpleAssetExchange.new();
      await exchange.setPriceProvider(provider.address)

      loan = await SmartLoan.new(provider.address, exchange.address);
    });



    it("should fund a loan", async function () {
      expect(fromWei(await loan.getTotalValue())).to.be.equal(0);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");

      await loan.fund({value: toWei("200")});

      expect(fromWei(await loan.getTotalValue())).to.be.equal(200);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");
    });


    it("should withdraw part of funds", async function () {
      await loan.withdraw(toWei("100"));

      expect(fromWei(await loan.getTotalValue())).to.be.equal(100);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");
    });

    it("should buy asset", async function () {
      await provider.setPrice(toBytes32('USD'), toWei("0.5"), {from: oracle});
      await loan.invest(toBytes32('USD'), toWei("100"));

      expect(fromWei(await loan.getAssetValue(toBytes32('USD')))).to.be.equal(50);

      expect(fromWei(await loan.getTotalValue())).to.be.equal(100);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");
    });

    it("should provide assets balances and prices", async function () {
      let balances = await loan.getAllAssetsBalances();
      expect(fromWei(balances[0])).to.be.equal(100);

      let prices = await loan.getAllAssetsPrices();
      expect(fromWei(prices[0])).to.be.equal(0.5);
    });

    it("should update valuation after price change", async function () {
      await provider.setPrice(toBytes32('USD'), toWei("0.1"), {from: oracle});

      expect(fromWei(await loan.getAssetValue(toBytes32('USD')))).to.be.equal(10);

      expect(fromWei(await loan.getTotalValue())).to.be.equal(60);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");
    });

    it("should redeem investmnet", async function () {
      await loan.redeem(toBytes32('USD'), toWei("100"));

      expect(fromWei(await loan.getAssetValue(toBytes32('USD')))).to.be.equal(0);

      expect(fromWei(await loan.getTotalValue())).to.be.equal(60);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");
    });

  });

});

