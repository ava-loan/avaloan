const {expect} = require('chai');
const {BN, time} = require('@openzeppelin/test-helpers');

const UtilisationRatesCalculator = artifacts.require('UtilisationRatesCalculator');

const toWei = web3.utils.toWei;
const fromWei = (val) => parseFloat(web3.utils.fromWei(val));

contract('UtilisationRatesCalculator', function ([owner]) {

  describe('Verify rates', function () {

    var calculator;

    before("deploy the Compounding index", async function () {
      calculator = await UtilisationRatesCalculator.new(toWei("0.5"), toWei("0.05"));
    });

    it("should calculate for 0% utilisation", async function () {
      let utilisation = fromWei(await calculator.getPoolUtilisation(0, toWei("100")));
      expect(utilisation).to.be.closeTo(0, 0.000001);

      let depositRate = fromWei(await calculator.calculateDepositRate(0, toWei("100")));
      expect(depositRate).to.be.closeTo(0, 0.000001);

      let borrowingRate = fromWei(await calculator.calculateBorrowingRate(0, toWei("100")));
      expect(borrowingRate).to.be.closeTo(0.05, 0.000001);
    });


    it("should calculate for 10% utilisation", async function () {
      let utilisation = fromWei(await calculator.getPoolUtilisation(toWei("10"), toWei("100")));
      expect(utilisation).to.be.closeTo(0.1, 0.000001);

      let depositRate = fromWei(await calculator.calculateDepositRate(toWei("10"), toWei("100")));
      expect(depositRate).to.be.closeTo(0.01, 0.000001);

      let borrowingRate = fromWei(await calculator.calculateBorrowingRate(toWei("10"), toWei("100")));
      expect(borrowingRate).to.be.closeTo(0.1, 0.000001);
    });


    it("should calculate for 50% utilisation", async function () {
      let utilisation = fromWei(await calculator.getPoolUtilisation(toWei("50"), toWei("100")));
      expect(utilisation).to.be.closeTo(0.5, 0.000001);

      let depositRate = fromWei(await calculator.calculateDepositRate(toWei("50"), toWei("100")));
      expect(depositRate).to.be.closeTo(0.15, 0.000001);

      let borrowingRate = fromWei(await calculator.calculateBorrowingRate(toWei("50"), toWei("100")));
      expect(borrowingRate).to.be.closeTo(0.3, 0.000001);
    });


    it("should calculate for 90% utilisation", async function () {
      let utilisation = fromWei(await calculator.getPoolUtilisation(toWei("90"), toWei("100")));
      expect(utilisation).to.be.closeTo(0.9, 0.000001);

      let depositRate = fromWei(await calculator.calculateDepositRate(toWei("90"), toWei("100")));
      expect(depositRate).to.be.closeTo(0.45, 0.000001);

      let borrowingRate = fromWei(await calculator.calculateBorrowingRate(toWei("90"), toWei("100")));
      expect(borrowingRate).to.be.closeTo(0.5, 0.000001);
    });

    it("should calculate for 100% utilisation", async function () {
      let utilisation = fromWei(await calculator.getPoolUtilisation(toWei("100"), toWei("100")));
      expect(utilisation).to.be.closeTo(1, 0.000001);

      let depositRate = fromWei(await calculator.calculateDepositRate(toWei("100"), toWei("100")));
      expect(depositRate).to.be.closeTo(0.55, 0.000001);

      let borrowingRate = fromWei(await calculator.calculateBorrowingRate(toWei("100"), toWei("100")));
      expect(borrowingRate).to.be.closeTo(0.55, 0.000001);
    });

  });

});

