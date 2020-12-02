const {expect} = require('chai');
const {BN, time} = require('@openzeppelin/test-helpers');

const toWei = web3.utils.toWei;
const fromWei = (val) => parseFloat(web3.utils.fromWei(val));

const Pool = artifacts.require('Pool');
const FixedRatesCalculator = artifacts.require('FixedRatesCalculator');

contract('Pool with variable interests rates', function ([owner]) {

  describe('Single deposit & rates increase', function () {

    var pool, ratesCalculator;

    before("Deploy Pool contract", async function () {
      pool = await Pool.new();
      ratesCalculator = await FixedRatesCalculator.new(toWei("0.05"), toWei("0.05"));
      await pool.setRatesCalculator(ratesCalculator.address);
    });

    it("should deposit", async function () {
      await pool.deposit({value: toWei("1.0")});
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(toWei("1", "ether"));

      let currentDeposits = fromWei(await pool.getDeposits(owner));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);
    });

    it("should hold for one year", async function () {
      await time.increase(time.duration.years(1));

      let oneYear = fromWei(await pool.getDeposits(owner));
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should increase rates", async function () {
      await ratesCalculator.setRates(web3.utils.toWei("0.1"), web3.utils.toWei("0.1"));
      await pool.setRatesCalculator(ratesCalculator.address);

      let oneYear = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should hold for another year", async function () {
      await time.increase(time.duration.years(1));

      let twoYears = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(twoYears).to.be.closeTo(1.161834, 0.000001);
    });

  });

  describe('Single deposit & rates decrease', function () {

    var pool, ratesCalculator;

    before("Deploy Pool contract", async function () {
      pool = await Pool.new();
      ratesCalculator = await FixedRatesCalculator.new(web3.utils.toWei("0.05"), web3.utils.toWei("0.05"));
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

    it("should increase rates", async function () {
      await ratesCalculator.setRates(web3.utils.toWei("0.01"), web3.utils.toWei("0.1"));
      await pool.setRatesCalculator(ratesCalculator.address);

      let oneYear = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should hold for another year", async function () {
      await time.increase(time.duration.years(1));

      let twoYears = parseFloat(web3.utils.fromWei(await pool.getDeposits(owner)));
      expect(twoYears).to.be.closeTo(1.061836, 0.000001);
    });

  });

});

