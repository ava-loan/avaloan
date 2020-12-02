const {expect} = require('chai');
const {BN, time, expectRevert} = require('@openzeppelin/test-helpers');

const Pool = artifacts.require('Pool');
const FixedRatesCalculator = artifacts.require('FixedRatesCalculator');

contract('Pool with fixed interests rates', function ([owner, depositor]) {

  // describe('Borrow and return on 0% rates', function () {
  //
  //   var pool;
  //
  //   before("Deploy Pool contract", async function () {
  //     pool = await Pool.new();
  //     let ratesCalculator = await FixedRatesCalculator.new(web3.utils.toWei("0"), web3.utils.toWei("0"));
  //     await pool.setRatesCalculator(ratesCalculator.address);
  //   });
  //
  //   it("should not be able to borrow without deposits", async function () {
  //     await expectRevert(
  //       pool.borrow(web3.utils.toWei("1.0")),
  //       "There is no enough funds in the pool to fund the loan."
  //     );
  //   });
  //
  //
  //   it("should borrow", async function () {
  //     await pool.deposit({from: depositor, value: web3.utils.toWei("1.0")});
  //
  //     await pool.borrow(web3.utils.toWei("1.0"));
  //     expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("0", "ether"));
  //
  //     let borrowed = parseFloat(web3.utils.fromWei(await pool.getBorrowed(owner)));
  //     expect(borrowed).to.be.closeTo(1.000000, 0.000001);
  //   });
  //
  //
  //   it("should return", async function () {
  //     await pool.repay({value: web3.utils.toWei("1")});
  //
  //     expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("1", "ether"));
  //
  //     let borrowed = parseFloat(web3.utils.fromWei(await pool.getBorrowed(owner)));
  //     expect(borrowed).to.be.closeTo(0, 0.000001);
  //   });
  //
  // });

  describe('Single borrowing with interest rates', function () {

    var pool;

    before("Deploy Pool contract", async function () {
      pool = await Pool.new();
      let ratesCalculator = await FixedRatesCalculator.new(web3.utils.toWei("0.05"), web3.utils.toWei("0.1"));
      await pool.setRatesCalculator(ratesCalculator.address);
      await pool.deposit({from: depositor, value: web3.utils.toWei("1.0")});
    });


    it("should borrow", async function () {
      await pool.borrow(web3.utils.toWei("1.0"));
      expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(web3.utils.toWei("0", "ether"));

      let borrowed = parseFloat(web3.utils.fromWei(await pool.getBorrowed(owner)));
      expect(borrowed).to.be.closeTo(1.000000, 0.000001);
    });

    it("should keep the loan for 1 year", async function () {
      await time.increase(time.duration.years(1));

      let borrowed = parseFloat(web3.utils.fromWei(await pool.getBorrowed(owner)));
      expect(borrowed).to.be.closeTo(1.105170, 0.000001);
    });


    it("should repay", async function () {
      await pool.repay({value: web3.utils.toWei("1.105170")});

      let borrowed = parseFloat(web3.utils.fromWei(await pool.getBorrowed(owner)));
      expect(borrowed).to.be.closeTo(0, 0.000001);
    });

  });

});

