import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import UtilisationRatesCalculatorArtifact
  from '../artifacts/contracts/UtilisationRatesCalculator.sol/UtilisationRatesCalculator.json';
import PoolArtifact from '../artifacts/contracts/Pool.sol/Pool.json';
import OpenBorrowersRegistryArtifact
  from '../artifacts/contracts/OpenBorrowersRegistry.sol/OpenBorrowersRegistry.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, getFixedGasSigners, time, toWei} from "./_helpers";
import {OpenBorrowersRegistry, Pool, UtilisationRatesCalculator} from "../typechain";
import {CompoundingIndex__factory, OpenBorrowersRegistry__factory} from "../typechain";

chai.use(solidity);

const {deployContract, provider} = waffle;
const ZERO = ethers.constants.AddressZero;

describe('Pool with fixed interests rates', () => {

  describe('Deposit, borrow, wait & borrow more', () => {
    let pool: Pool,
      borrower: SignerWithAddress,
      depositor: SignerWithAddress,
      ratesCalculator: UtilisationRatesCalculator;

    before("Deploy Pool contract", async () => {
      [borrower, depositor] = await getFixedGasSigners(10000000);
      ratesCalculator = (await deployContract(borrower, UtilisationRatesCalculatorArtifact, [toWei("0.5"), toWei("0.05")])) as UtilisationRatesCalculator;
      pool = (await deployContract(borrower, PoolArtifact)) as Pool;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(borrower).deploy());

      await pool.initialize(ratesCalculator.address, borrowersRegistry.address, ZERO, ZERO);

    });

    it("should deposit", async () => {
      await pool.connect(depositor).deposit({value: toWei("1.0")});
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("1", "ether"));

      const currentDeposits = fromWei(await pool.getDeposits(depositor.address));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);

      const depositRate = fromWei(await pool.getDepositRate());
      expect(depositRate).to.be.closeTo(0, 0.000001);

      const borrowingRate = fromWei(await pool.getBorrowingRate());
      expect(borrowingRate).to.be.closeTo(0.05, 0.000001);
    });


    it("should borrow", async () => {
      await pool.borrow(toWei("0.5"));
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("0.5", "ether"));

      const currentDeposits = fromWei(await pool.getDeposits(depositor.address));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);

      const currentBorrowed = fromWei(await pool.getBorrowed(borrower.address));
      expect(currentBorrowed).to.be.closeTo(0.5, 0.000001);

      const depositRate = fromWei(await pool.getDepositRate());
      expect(depositRate).to.be.closeTo(0.15, 0.000001);

      const borrowingRate = fromWei(await pool.getBorrowingRate());
      expect(borrowingRate).to.be.closeTo(0.3, 0.000001);
    });


    it("should accumulate interests for 1 year", async () => {
      await time.increase(time.duration.years(1));
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("0.5", "ether"));

      const currentDeposits = fromWei(await pool.getDeposits(depositor.address));
      expect(currentDeposits).to.be.closeTo(1.161834, 0.000001);

      const currentBorrowed = fromWei(await pool.getBorrowed(borrower.address));
      expect(currentBorrowed).to.be.closeTo(0.674929, 0.000001);

      const depositRate = fromWei(await pool.getDepositRate());
      expect(depositRate).to.be.closeTo(0.15, 0.000001);

      const borrowingRate = fromWei(await pool.getBorrowingRate());
      expect(borrowingRate).to.be.closeTo(0.3, 0.000001);
    });


    it("should repay part of the loan", async () => {
      await pool.repay({value: toWei("0.424929")});

      const currentDeposits = fromWei(await pool.getDeposits(depositor.address));
      expect(currentDeposits).to.be.closeTo(1.161834, 0.000001);

      const currentBorrowed = fromWei(await pool.getBorrowed(borrower.address));
      expect(currentBorrowed).to.be.closeTo(0.25, 0.000001);

      const depositRate = fromWei(await pool.getDepositRate());
      expect(depositRate).to.be.closeTo(0.043750, 0.000001);

      const borrowingRate = fromWei(await pool.getBorrowingRate());
      expect(borrowingRate).to.be.closeTo(0.175, 0.000001);
    });


    it("should accumulate interests for another year", async () => {
      await time.increase(time.duration.years(1));
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("0.924929", "ether"));

      const currentDeposits = fromWei(await pool.getDeposits(depositor.address));
      expect(currentDeposits).to.be.closeTo(1.213792, 0.000001);

      const currentBorrowed = fromWei(await pool.getBorrowed(borrower.address));
      expect(currentBorrowed).to.be.closeTo(0.297812, 0.000001);

      const depositRate = fromWei(await pool.getDepositRate());
      expect(depositRate).to.be.closeTo(0.043750, 0.000001);

      const borrowingRate = fromWei(await pool.getBorrowingRate());
      expect(borrowingRate).to.be.closeTo(0.175, 0.000001);
    });

  });

});
