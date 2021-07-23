import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import FixedRatesCalculatorArtifact from '../artifacts/contracts/FixedRatesCalculator.sol/FixedRatesCalculator.json';
import PoolArtifact from '../artifacts/contracts/Pool.sol/Pool.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, time, toWei} from "./_helpers";
import {FixedRatesCalculator, Pool} from "../typechain";

chai.use(solidity);

const {deployContract, provider} = waffle;

describe('Pool with variable interests rates', () => {

  describe('Single deposit & rates increase', () => {
    let pool: Pool,
      ratesCalculator: FixedRatesCalculator,
      owner: SignerWithAddress;

    before("Deploy Pool contract", async () => {
      [owner] = await ethers.getSigners();

      ratesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.05")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      await pool.setRatesCalculator(ratesCalculator.address);
    });

    it("should deposit", async () => {
      await pool.deposit({value: toWei("1.0")});
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("1", "ether"));

      const currentDeposits = fromWei(await pool.balanceOf(owner.address));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);
    });

    it("should hold for one year", async () => {
      await time.increase(time.duration.years(1));

      const oneYear = fromWei(await pool.balanceOf(owner.address));
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should increase rates", async () => {
      await ratesCalculator.setRates(toWei("0.1"), toWei("0.1"));
      await pool.setRatesCalculator(ratesCalculator.address);

      const oneYear = fromWei(await pool.balanceOf(owner.address));
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should hold for another year", async () => {
      await time.increase(time.duration.years(1));

      const twoYears = fromWei(await pool.balanceOf(owner.address));
      expect(twoYears).to.be.closeTo(1.161834, 0.000001);
    });

  });

  describe('Single deposit & rates decrease', () => {
    let pool: Pool,
      ratesCalculator: FixedRatesCalculator,
      owner: SignerWithAddress;

    before("Deploy Pool contract", async () => {
      [owner] = await ethers.getSigners();

      ratesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.05")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      await pool.setRatesCalculator(ratesCalculator.address);
    });

    it("should deposit", async () => {
      await pool.deposit({value: toWei("1.0")});
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("1", "ether"));

      const currentDeposits = fromWei(await pool.balanceOf(owner.address));
      expect(currentDeposits).to.be.closeTo(1.000000, 0.000001);
    });

    it("should hold for one year", async () => {
      await time.increase(time.duration.years(1));

      const oneYear = fromWei(await pool.balanceOf(owner.address));
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should increase rates", async () => {
      await ratesCalculator.setRates(toWei("0.01"), toWei("0.1"));
      await pool.setRatesCalculator(ratesCalculator.address);

      let oneYear = fromWei(await pool.balanceOf(owner.address));
      expect(oneYear).to.be.closeTo(1.051271, 0.000001);
    });

    it("should hold for another year", async () => {
      await time.increase(time.duration.years(1));

      let twoYears = fromWei(await pool.balanceOf(owner.address));
      expect(twoYears).to.be.closeTo(1.061836, 0.000001);
    });

  });

});
