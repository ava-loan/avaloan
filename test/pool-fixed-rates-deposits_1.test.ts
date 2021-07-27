import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import FixedRatesCalculatorArtifact from '../artifacts/contracts/FixedRatesCalculator.sol/FixedRatesCalculator.json';
import OpenBorrowersRegistryArtifact from '../artifacts/contracts/OpenBorrowersRegistry.sol/OpenBorrowersRegistry.json';
import PoolArtifact from '../artifacts/contracts/Pool.sol/Pool.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, time, toWei} from "./_helpers";
import {Pool, OpenBorrowersRegistry, FixedRatesCalculator} from "../typechain";
import {CompoundingIndex__factory} from "../typechain";

chai.use(solidity);

const {deployContract, provider} = waffle;

describe('Pool with fixed interests rates (1)', () => {
  let sut: Pool,
    owner: SignerWithAddress,
    user: SignerWithAddress,
    user2: SignerWithAddress,
    fixedRatesCalculator;

  beforeEach(async () => {
    [owner, user, user2] = await ethers.getSigners();

    fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.05")])) as FixedRatesCalculator;
    sut = (await deployContract(owner, PoolArtifact)) as Pool;

    const borrowersRegistry = (await deployContract(owner, OpenBorrowersRegistryArtifact)) as OpenBorrowersRegistry;
    const depositIndex = await (new CompoundingIndex__factory(owner).deploy(sut.address));
    const borrowIndex = await (new CompoundingIndex__factory(owner).deploy(sut.address));

    await sut.initialize(fixedRatesCalculator.address, borrowersRegistry.address, depositIndex.address, borrowIndex.address);
  });

  it("should deposit requested value", async () => {
    await sut.deposit({value: toWei("1.0")});
    expect(await provider.getBalance(sut.address)).to.equal(toWei("1"));

    const currentDeposits = await sut.getDeposits(owner.address);
    expect(fromWei(currentDeposits)).to.equal(1);
  });

  it("should deposit on proper address", async () => {
    await sut.deposit({value: toWei("3.0")});
    await sut.connect(user).deposit({value: toWei("5.0")});
    await sut.connect(user2).deposit({value: toWei("7.0")});

    expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(3.00000, 0.00001);
    expect(fromWei(await sut.getDeposits(user.address))).to.be.closeTo(5.00000, 0.00001);
    expect(fromWei(await sut.getDeposits(user2.address))).to.be.closeTo(7.00000, 0.00001);
  });

  describe("should increase deposit value as time goes", () => {

    it("should hold for one year", async function () {
      await sut.deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(1));

      const oneYearDeposit = await sut.getDeposits(owner.address);
      expect(fromWei(oneYearDeposit)).to.be.closeTo(1.051271, 0.000001);
    });

    it("should hold for two years", async function () {
      await sut.deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(2));

      const twoYearsDeposit = await sut.getDeposits(owner.address);
      expect(fromWei(twoYearsDeposit)).to.be.closeTo(1.105170, 0.000001);
    });

    it("should hold for three years", async function () {
      await sut.deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(3));

      const threeYearsDeposit = await sut.getDeposits(owner.address);
      expect(fromWei(threeYearsDeposit)).to.be.closeTo(1.161834, 0.000001);
    });

    it("should hold for five years", async function () {
      await sut.deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(5));

      const fiveYearsDeposit = await sut.getDeposits(owner.address);
      expect(fromWei(fiveYearsDeposit)).to.be.closeTo(1.284025, 0.000001);
    });

    it("should hold for ten years", async function () {
      await sut.deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(10));
      const tenYearsDeposit = await sut.getDeposits(owner.address);
      expect(fromWei(tenYearsDeposit)).to.be.closeTo(1.6487212, 0.000001);
    });

    describe("after 1 year delay", () => {
      beforeEach(async () => {
        await time.increase(time.duration.years(1));
      });

      it("should not change deposit value", async function () {
        const oneYearDeposit = await sut.getDeposits(owner.address);
        expect(fromWei(oneYearDeposit)).to.be.closeTo(0, 0.000001);
      });

      it("should increase deposit after another year", async function () {
        await sut.deposit({value: toWei("1.0")});
        expect(await provider.getBalance(sut.address)).to.equal(toWei("1"));

        await time.increase(time.duration.years(1));
        const oneYearDeposit = await sut.getDeposits(owner.address);
        expect(fromWei(oneYearDeposit)).to.be.closeTo(1.051271, 0.000001);
      });
    });

  });

});

