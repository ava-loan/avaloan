const {expect} = require('chai');
const {BN, time} = require('@openzeppelin/test-helpers');

const Pool = artifacts.require('Pool');
const UtilisationRatesCalculator = artifacts.require('UtilisationRatesCalculator');

const toWei = web3.utils.toWei;
const fromWei = (val) => parseFloat(web3.utils.fromWei(val));

contract('Pool with fixed interests rates', function ([borrower, depositor]) {

  describe('Deposit, borrow, wait & borrow more', function () {

    var pool, calculator;

    before("Deploy Pool contract", async function () {
      pool = await Pool.new();
      calculator = await UtilisationRatesCalculator.new(toWei("0.5"), toWei("0.05"));
      await pool.setRatesCalculator(calculator.address);
    });


    it("should deposit", async function () {
      await pool.deposit({value: toWei("1.0"), from: depositor});
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("1", "ether"));

      let currentDeposits = fromWei(await pool.getDeposits(depositor));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);

      let depositRate = fromWei(await pool.getDepositRate());
      expect(depositRate).to.be.closeTo(0, 0.000001);

      let borrowingRate = fromWei(await pool.getBorrowingRate());
      expect(borrowingRate).to.be.closeTo(0.05, 0.000001);
    });


    it("should borrow", async function () {
      await pool.borrow(toWei("0.5"));
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("0.5", "ether"));

      let currentDeposits = fromWei(await pool.getDeposits(depositor));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);

      let currentBorrowed = fromWei(await pool.getBorrowed(borrower));
      expect(currentBorrowed).to.be.closeTo(0.5, 0.000001);

      let depositRate = fromWei(await pool.getDepositRate());
      expect(depositRate).to.be.closeTo(0.15, 0.000001);

      let borrowingRate = fromWei(await pool.getBorrowingRate());
      expect(borrowingRate).to.be.closeTo(0.3, 0.000001);
    });


    it("should accumulate interests for 1 year", async function () {
      await time.increase(time.duration.years(1));
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("0.5", "ether"));

      let currentDeposits = fromWei(await pool.getDeposits(depositor));
      expect(currentDeposits).to.be.closeTo(1.161834, 0.000001);

      let currentBorrowed = fromWei(await pool.getBorrowed(borrower));
      expect(currentBorrowed).to.be.closeTo(0.674929, 0.000001);

      let depositRate = fromWei(await pool.getDepositRate());
      expect(depositRate).to.be.closeTo(0.15, 0.000001);

      let borrowingRate = fromWei(await pool.getBorrowingRate());
      expect(borrowingRate).to.be.closeTo(0.3, 0.000001);
    });


    it("should repay part of the loan", async function () {
      await pool.repay({value: toWei("0.424929")});

      let currentDeposits = fromWei(await pool.getDeposits(depositor));
      expect(currentDeposits).to.be.closeTo(1.161834, 0.000001);

      let currentBorrowed = fromWei(await pool.getBorrowed(borrower));
      expect(currentBorrowed).to.be.closeTo(0.25, 0.000001);

      let depositRate = fromWei(await pool.getDepositRate());
      expect(depositRate).to.be.closeTo(0.043750, 0.000001);

      let borrowingRate = fromWei(await pool.getBorrowingRate());
      expect(borrowingRate).to.be.closeTo(0.175, 0.000001);
    });


    it("should accumulate interests for another year", async function () {
      await time.increase(time.duration.years(1));
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("0.924929", "ether"));

      let currentDeposits = fromWei(await pool.getDeposits(depositor));
      expect(currentDeposits).to.be.closeTo(1.213792, 0.000001);

      let currentBorrowed = fromWei(await pool.getBorrowed(borrower));
      expect(currentBorrowed).to.be.closeTo(0.297812, 0.000001);

      let depositRate = fromWei(await pool.getDepositRate());
      expect(depositRate).to.be.closeTo(0.043750, 0.000001);

      let borrowingRate = fromWei(await pool.getBorrowingRate());
      expect(borrowingRate).to.be.closeTo(0.175, 0.000001);
    });

  });

});

