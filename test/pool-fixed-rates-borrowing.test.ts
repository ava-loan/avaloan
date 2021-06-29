import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import FixedRatesCalculatorArtifact from '../artifacts/contracts/FixedRatesCalculator.sol/FixedRatesCalculator.json';
import PoolArtifact from '../artifacts/contracts/Pool.sol/Pool.json';
import OpenBorrowersRegistryArtifact
  from '../artifacts/contracts/OpenBorrowersRegistry.sol/OpenBorrowersRegistry.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, time, toWei} from "./_helpers";
import {FixedRatesCalculator, OpenBorrowersRegistry, Pool} from "../typechain";

chai.use(solidity);

const {deployContract, provider} = waffle;

describe('Pool with fixed interests rates', () => {

  describe('Single borrowing with interest rates', () => {
    let sut: Pool,
      owner: SignerWithAddress,
      depositor: SignerWithAddress,
      fixedRatesCalculator: FixedRatesCalculator;

    before("Deploy Pool contract", async () => {
      [owner, depositor] = await ethers.getSigners();
      fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      sut = (await deployContract(owner, PoolArtifact)) as Pool;
      await sut.setRatesCalculator(fixedRatesCalculator.address);

      let borrowersRegistry = (await deployContract(owner, OpenBorrowersRegistryArtifact)) as OpenBorrowersRegistry;
      await sut.setBorrowersRegistry(borrowersRegistry.address);
      await sut.connect(depositor).deposit({value: toWei("1.0")});
    });

    it("should borrow", async () => {
      await sut.borrow(toWei("1.0"));
      expect(await provider.getBalance(sut.address)).to.be.equal(toWei("0", "ether"));

      let borrowed = fromWei(await sut.getBorrowed(owner.address));
      expect(borrowed).to.be.closeTo(1.000000, 0.000001);
    });

    it("should keep the loan for 1 year", async () => {
      await time.increase(time.duration.years(1));

      let borrowed = fromWei(await sut.getBorrowed(owner.address));
      expect(borrowed).to.be.closeTo(1.105170, 0.000001);
    });

    it("should repay", async () => {
      await sut.repay({value: toWei("1.105170")});

      let borrowed = fromWei(await sut.getBorrowed(owner.address));
      expect(borrowed).to.be.closeTo(0, 0.000001);
    });

  });

  describe('Single borrowing after a delay', () => {
    let sut: Pool,
      owner: SignerWithAddress,
      depositor: SignerWithAddress,
      fixedRatesCalculator;

    before("Deploy Pool contract", async () => {
      [owner, depositor] = await ethers.getSigners();
      fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      sut = (await deployContract(owner, PoolArtifact)) as Pool;
      await sut.setRatesCalculator(fixedRatesCalculator.address);

      let borrowersRegistry = (await deployContract(owner, OpenBorrowersRegistryArtifact)) as OpenBorrowersRegistry;
      await sut.setBorrowersRegistry(borrowersRegistry.address);
      await sut.connect(depositor).deposit({value: toWei("1.0")});
    });

    it("should wait for 1 year", async () => {
      await time.increase(time.duration.years(1));

      let borrowed = fromWei(await sut.getBorrowed(owner.address));
      expect(borrowed).to.be.closeTo(0, 0.000001);
    });

    it("should borrow", async () => {
      await sut.borrow(toWei("1.0"));
      expect(await provider.getBalance(sut.address)).to.be.equal(toWei("0", "ether"));

      let borrowed = fromWei(await sut.getBorrowed(owner.address));
      expect(borrowed).to.be.closeTo(1.000000, 0.000001);
    });

    it("should keep the loan for 1 year", async () => {
      await time.increase(time.duration.years(1));

      let borrowed = fromWei(await sut.getBorrowed(owner.address));
      expect(borrowed).to.be.closeTo(1.105170, 0.000001);
    });

    it("should repay", async () => {
      await sut.repay({value: toWei("1.105170")});

      let borrowed = fromWei(await sut.getBorrowed(owner.address));
      expect(borrowed).to.be.closeTo(0, 0.000001);
    });

  });

});
