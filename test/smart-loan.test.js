const {expect} = require('chai');
const {expectRevert} = require('@openzeppelin/test-helpers');

const SimplePriceProvider = artifacts.require('SimplePriceProvider');
const SimpleAssetExchange = artifacts.require('SimpleAssetExchange');
const SmartLoan = artifacts.require('SmartLoan');

const Pool = artifacts.require('Pool');
const FixedRatesCalculator = artifacts.require('FixedRatesCalculator');
const OpenBorrowersRegistry = artifacts.require('OpenBorrowersRegistry');

const toWei = web3.utils.toWei;
const fromWei = (val) => parseFloat(web3.utils.fromWei(val));
const toBytes32 = web3.utils.fromAscii;

contract('Smart loan', function ([owner, oracle, depositor, liquidator]) {

  describe('A loan without debt', function () {

    var provider, exchange, loan, pool;

    before("deploy the Smart Loan", async function () {
      provider = await SimplePriceProvider.new();
      await provider.setOracle(oracle);

      exchange = await SimpleAssetExchange.new();
      await exchange.setPriceProvider(provider.address);
    });


    it("should deploy a pool", async function () {
      pool = await Pool.new();
      let ratesCalculator = await FixedRatesCalculator.new(web3.utils.toWei("0.05"), web3.utils.toWei("0.1"));
      let borrowersRegistry = await OpenBorrowersRegistry.new();
      await pool.setRatesCalculator(ratesCalculator.address);
      await pool.setBorrowersRegistry(borrowersRegistry.address);
      await pool.deposit({from: depositor, value: web3.utils.toWei("1000")});

      loan = await SmartLoan.new(provider.address, exchange.address, pool.address);
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

  describe('A loan with debt and repayment', function () {

    var provider, exchange, loan, pool;

    before("deploy the Smart Loan", async function () {
      provider = await SimplePriceProvider.new();
      await provider.setOracle(oracle);

      exchange = await SimpleAssetExchange.new();
      await exchange.setPriceProvider(provider.address);


    });


    it("should deploy a pool", async function () {
      pool = await Pool.new();
      let ratesCalculator = await FixedRatesCalculator.new(web3.utils.toWei("0.05"), web3.utils.toWei("0.1"));
      let borrowersRegistry = await OpenBorrowersRegistry.new();
      await pool.setRatesCalculator(ratesCalculator.address);
      await pool.setBorrowersRegistry(borrowersRegistry.address);
      await pool.deposit({from: depositor, value: web3.utils.toWei("1000")});

      loan = await SmartLoan.new(provider.address, exchange.address, pool.address);
    });


    it("should fund a loan", async function () {
      expect(fromWei(await loan.getTotalValue())).to.be.equal(0);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");

      await loan.fund({value: toWei("100")});

      expect(fromWei(await loan.getTotalValue())).to.be.equal(100);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");
    });


    it("should borrow funds", async function () {
      await loan.borrow(toWei("200"));

      expect(fromWei(await loan.getTotalValue())).to.be.equal(300);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(200, 0.1);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("1499");
    });


    it("should repay funds", async function () {
      await loan.repay(toWei("100"));

      expect(fromWei(await loan.getTotalValue())).to.be.equal(200);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(100, 0.1);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("1999");
    });


    it("should prevent borrowing too much", async function () {
      await expectRevert(
        loan.borrow(toWei("500")),
        "The action may cause an account to become insolvent"
      );
    });

  });

  describe('A loan with liquidation', function () {

    var provider, exchange, loan, pool;

    before("deploy the Smart Loan", async function () {
      provider = await SimplePriceProvider.new();
      await provider.setOracle(oracle);

      exchange = await SimpleAssetExchange.new();
      await exchange.setPriceProvider(provider.address);


    });


    it("should deploy a pool", async function () {
      pool = await Pool.new();
      let ratesCalculator = await FixedRatesCalculator.new(web3.utils.toWei("0.05"), web3.utils.toWei("0.1"));
      let borrowersRegistry = await OpenBorrowersRegistry.new();
      await pool.setRatesCalculator(ratesCalculator.address);
      await pool.setBorrowersRegistry(borrowersRegistry.address);
      await pool.deposit({from: depositor, value: web3.utils.toWei("1000")});

      loan = await SmartLoan.new(provider.address, exchange.address, pool.address);
    });


    it("should fund a loan", async function () {
      await loan.fund({value: toWei("100")});
    });


    it("should borrow funds", async function () {
      await loan.borrow(toWei("400"));

      expect(fromWei(await loan.getTotalValue())).to.be.equal(500);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(400, 0.1);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("1249");
    });


    it("should invest", async function () {
      await provider.setPrice(toBytes32('USD'), toWei("0.5"), {from: oracle});
      await loan.invest(toBytes32('USD'), toWei("100"));
    });


    it("should update valuation after price change", async function () {
      await provider.setPrice(toBytes32('USD'), toWei("0.1"), {from: oracle});

      expect(fromWei(await loan.getAssetValue(toBytes32('USD')))).to.be.equal(10);

      expect(fromWei(await loan.getTotalValue())).to.be.equal(460);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(400, 0.1);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("1149");
    });


    it("should liquidate", async function () {
      expect(await loan.isSolvent()).to.be.false;
      expect(fromWei(await loan.getTotalValue())).to.be.equal(460);

      await loan.liquidate(toWei("300"), {from: liquidator});

      //Liquidator bonus was 10% of 300 = 30
      expect(fromWei(await loan.getTotalValue())).to.be.equal(130);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(100, 0.1);
      expect(await loan.isSolvent()).to.be.true;

    });







  });

});

