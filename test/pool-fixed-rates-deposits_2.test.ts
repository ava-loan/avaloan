import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import FixedRatesCalculatorArtifact from '../artifacts/contracts/FixedRatesCalculator.sol/FixedRatesCalculator.json';
import OpenBorrowersRegistryArtifact from '../artifacts/contracts/OpenBorrowersRegistry.sol/OpenBorrowersRegistry.json';
import PoolArtifact from '../artifacts/contracts/Pool.sol/Pool.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, time, toWei} from "./_helpers";
import {deployMockContract} from '@ethereum-waffle/mock-contract';
import {Pool, OpenBorrowersRegistry, FixedRatesCalculator} from "../typechain";
import {CompoundingIndex__factory} from "../typechain";

chai.use(solidity);

const {deployContract, provider} = waffle;

describe('Pool with fixed interests rates', () => {
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

  describe('should properly make multiple deposits', () => {
    beforeEach(async () => {
      await sut.deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(1));
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(1.051271, 0.000001);
    });

    it("should properly make another deposits", async () => {
      await sut.deposit({value: toWei("1.0")});
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(2.051271, 0.000001);

      await sut.deposit({value: toWei("2.0")});
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(4.051271, 0.000001);

      await sut.deposit({value: toWei("5.7")});
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(9.751271, 0.000001);

      await sut.deposit({value: toWei("3.00083")});
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(12.752101, 0.000001);
    });

    it("should properly make another deposits with different time gaps", async () => {
      await sut.deposit({value: toWei("1.0")});
      await time.increase(time.duration.months(6));
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(2.102479, 0.000001);

      await sut.deposit({value: toWei("2.0")});
      await time.increase(time.duration.years(3));
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(4.766400, 0.000001);

      await sut.deposit({value: toWei("5.7")});
      await time.increase(time.duration.months(3));
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(10.596237, 0.000001);

      await sut.deposit({value: toWei("3.00083")});
      await time.increase(time.duration.years(1));
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(14.294203, 0.000001);
    });

  });

  describe("withdraw function", () => {
    it("should not allow to withdraw when no deposit", async () => {
      await expect(sut.withdraw(toWei("0.5")))
        .to.be.revertedWith("You are trying to withdraw more that was deposited.");
      await expect(sut.withdraw(toWei("0.000000001")))
        .to.be.revertedWith("You are trying to withdraw more that was deposited.");
      ;
    });

    it("should not allow to withdraw more than already on deposit", async () => {
      await sut.deposit({value: toWei("1.0")});
      await expect(sut.withdraw(toWei("1.0001")))
        .to.be.revertedWith("You are trying to withdraw more that was deposited.");
    });

    it("should not allow to withdraw more than already on deposit after accumulating interests", async () => {
      await sut.deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(1));

      await expect(sut.withdraw(toWei("1.052")))
        .to.be.revertedWith("You are trying to withdraw more that was deposited.");
    });

    it("should allow to withdraw all deposit", async () => {
      await sut.deposit({value: toWei("1.0")});

      await sut.withdraw(toWei("1.0"))

      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(0, 0.000001);
    });

    it("should allow to withdraw all deposit after multiple deposits", async () => {
      await sut.deposit({value: toWei("1.0")});
      await sut.deposit({value: toWei("2.5")});
      await sut.deposit({value: toWei("3.7")});

      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(7.2000, 0.000001);

      await sut.withdraw(toWei("7.2000"));
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(0, 0.000001);
    });

    it("should allow to withdraw part of the deposit", async () => {
      await sut.deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(1));
      await sut.withdraw(toWei("0.2000"));
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(0.85127, 0.00001);

      await sut.deposit({value: toWei("2.5")});
      await time.increase(time.duration.years(3));
      await sut.withdraw(toWei("1.3000"));
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(2.59362, 0.00001);

      await sut.deposit({value: toWei("3.7")});
      await time.increase(time.duration.years(3));
      await sut.withdraw(toWei("2.1400"));
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(5.172145, 0.000001);
    });

    it("should withdraw deposit from proper address", async () => {
      await sut.deposit({value: toWei("3.0")});
      await sut.connect(user).deposit({value: toWei("5.0")});

      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(3.00000, 0.00001);
      expect(fromWei(await sut.getDeposits(user.address))).to.be.closeTo(5.00000, 0.00001);

      await sut.connect(owner).withdraw(toWei("1.000"));
      expect(fromWei(await sut.getDeposits(owner.address))).to.be.closeTo(2.00000, 0.00001);

      await sut.connect(user).withdraw(toWei("2.000"));
      expect(fromWei(await sut.getDeposits(user.address))).to.be.closeTo(3.00000, 0.00001);
    });

  });

});

