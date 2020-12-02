const {expect} = require('chai');
const {BN, time} = require('@openzeppelin/test-helpers');

const Pool = artifacts.require('Pool');
const FixedRatesCalculator = artifacts.require('FixedRatesCalculator');

contract('Pool with fixed interests rates', function ([owner]) {

  describe('Single deposit', function () {

    var pool;

    before("Deploy Pool contract", async function () {
      pool = await Pool.new();
      let ratesCalculator = await FixedRatesCalculator.new(web3.utils.toWei("0.05"), web3.utils.toWei("0.05"));
      await pool.setRatesCalculator(ratesCalculator.address);
    });

    it("should deposit", async function () {
      await pool.deposit({value: web3.utils.toWei("1.0")});
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("1", "ether"));

      let currentDeposits = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);
    });

    it("should hold for one year", async function () {
      await time.increase(time.duration.years(1));

      let oneYear = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should hold for two years", async function () {
      await time.increase(time.duration.years(1));

      let twoYears = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(twoYears).to.be.closeTo(1.105170, 0.000001);
    });

  });

  describe('Single deposit after delay', function () {

    var pool;

    before("Deploy Pool contract", async function () {
      pool = await Pool.new();
      let ratesCalculator = await FixedRatesCalculator.new(web3.utils.toWei("0.05"), web3.utils.toWei("0.05"));
      await pool.setRatesCalculator(ratesCalculator.address);
    });

    it("should wait one year", async function () {
      await time.increase(time.duration.years(1));

      let oneYear = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(oneYear).to.be.closeTo(0, 0.000001);
    });

    it("should deposit", async function () {
      await pool.deposit({value: web3.utils.toWei("1.0")});
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("1", "ether"));

      let currentDeposits = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);
    });

    it("should hold for after another year", async function () {
      await time.increase(time.duration.years(1));

      let twoYears = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(twoYears).to.be.closeTo(1.051271, 0.000001);
    });

  });

  describe('Two deposits in a row', function () {

    var pool;

    before("Deploy Pool contract", async function () {
      pool = await Pool.new();
      let ratesCalculator = await FixedRatesCalculator.new(web3.utils.toWei("0.05"), web3.utils.toWei("0.05"));
      await pool.setRatesCalculator(ratesCalculator.address);
    });

    it("should deposit", async function () {
      await pool.deposit({value: web3.utils.toWei("1.0")});
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("1", "ether"));

      let currentDeposits = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);
    });

    it("should hold for one year", async function () {
      await time.increase(time.duration.years(1));

      let oneYear = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should deposit again", async function () {
      await pool.deposit({value: web3.utils.toWei("1.0")});
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("2", "ether"));

      let currentDeposits = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(currentDeposits).to.be.closeTo(2.051271, 0.000001);
    });

    it("should increases rates after another year", async function () {
      await time.increase(time.duration.years(1));

      let twoYears = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(twoYears).to.be.closeTo(2.156442, 0.000001);
    });

  });

  describe('Two deposits with one-year gap', function () {

    var pool;

    before("Deploy Pool contract", async function () {
      pool = await Pool.new();
      let ratesCalculator = await FixedRatesCalculator.new(web3.utils.toWei("0.05"), web3.utils.toWei("0.05"));
      await pool.setRatesCalculator(ratesCalculator.address);
    });

    it("should deposit", async function () {
      await pool.deposit({value: web3.utils.toWei("1.0")});
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("1", "ether"));

      let currentDeposits = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);
    });

    it("should hold for one year", async function () {
      await time.increase(time.duration.years(1));

      let oneYear = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should deposit again", async function () {
      await pool.deposit({value: web3.utils.toWei("1.0")});
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("2", "ether"));

      let currentDeposits = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(currentDeposits).to.be.closeTo(2.051271, 0.000001);
    });

    it("should increases rates after another year", async function () {
      await time.increase(time.duration.years(1));

      let twoYears = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(twoYears).to.be.closeTo(2.156442, 0.000001);
    });

  });

  describe('Deposit, hold & withdrawal half', function () {

    var pool;

    before("Deploy Pool contract", async function () {
      pool = await Pool.new();
      let ratesCalculator = await FixedRatesCalculator.new(web3.utils.toWei("0.05"), web3.utils.toWei("0.05"));
      await pool.setRatesCalculator(ratesCalculator.address);
    });

    it("should deposit", async function () {
      await pool.deposit({value: web3.utils.toWei("1.0")});
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("1", "ether"));

      let currentDeposits = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);
    });

    it("should hold for one year", async function () {
      await time.increase(time.duration.years(1));

      let oneYear = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should withdraw half of the funds", async function () {
      await pool.withdraw(web3.utils.toWei("0.5"));

      let currentDeposits = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(currentDeposits).to.be.closeTo(0.551271, 0.000001);
    });

    it("should accumulate interests after another year", async function () {
      await time.increase(time.duration.years(1));

      let twoYears = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(twoYears).to.be.closeTo(0.5795353715730955, 0.000001);
    });

  });

});

