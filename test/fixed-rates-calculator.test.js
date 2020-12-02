const {expect} = require('chai');

const FixedRatesCalculator = artifacts.require('FixedRatesCalculator');

const toWei = web3.utils.toWei;
const fromWei = (val) => parseFloat(web3.utils.fromWei(val));

contract('FixedRatesCalculator', function ([owner]) {

  describe('Verify rates', function () {

    var calculator;

    before("deploy the Calculator", async function () {
      calculator = await FixedRatesCalculator.new(toWei("0.05"), toWei("0.1"));
    });

    it("should calculate for 0% utilisation", async function () {
      let depositRate = fromWei(await calculator.calculateDepositRate(0, toWei("100")));
      expect(depositRate).to.be.closeTo(0.05, 0.001);

      let borrowingRate = fromWei(await calculator.calculateBorrowingRate(0, toWei("100")));
      expect(borrowingRate).to.be.closeTo(0.1, 0.001);
    });


    it("should calculate for 50% utilisation", async function () {
      let depositRate = fromWei(await calculator.calculateDepositRate(toWei("50"), toWei("100")));
      expect(depositRate).to.be.closeTo(0.05, 0.001);

      let borrowingRate = fromWei(await calculator.calculateBorrowingRate(toWei("50"), toWei("100")));
      expect(borrowingRate).to.be.closeTo(0.1, 0.001);
    });


    it("should calculate for 100% utilisation", async function () {
      let depositRate = fromWei(await calculator.calculateDepositRate(toWei("100"), toWei("100")));
      expect(depositRate).to.be.closeTo(0.05, 0.001);

      let borrowingRate = fromWei(await calculator.calculateBorrowingRate(toWei("100"), toWei("100")));
      expect(borrowingRate).to.be.closeTo(0.1, 0.001);
    });

  });

});

