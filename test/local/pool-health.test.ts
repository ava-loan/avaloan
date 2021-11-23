import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import VariableUtilisationRatesCalculatorArtifact
  from '../../artifacts/contracts/VariableUtilisationRatesCalculator.sol/VariableUtilisationRatesCalculator.json';
import PoolArtifact from '../../artifacts/contracts/Pool.sol/Pool.json';
import DestructableArtifact from '../../artifacts/contracts/mock/DestructableContract.sol/DestructableContract.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, getFixedGasSigners, time, toWei} from "../_helpers";
import {
  OpenBorrowersRegistry__factory,
  Pool,
  VariableUtilisationRatesCalculator,
  DestructableContract
} from "../../typechain";

chai.use(solidity);

const {deployContract, provider} = waffle;
const ZERO = ethers.constants.AddressZero;

describe('Safety tests of pool', () => {

  describe('Forcefully fund pool', () => {
    let pool: Pool,
      destructable: DestructableContract,
      owner: SignerWithAddress,
      user1: SignerWithAddress,
      user2: SignerWithAddress,
      user3: SignerWithAddress,
      ratesCalculator: VariableUtilisationRatesCalculator;

    before("Deploy a pool contract and a destructable contract for force funding", async () => {
      [owner, user1, user2, user3] = await getFixedGasSigners(10000000);
      ratesCalculator = (await deployContract(owner, VariableUtilisationRatesCalculatorArtifact) as VariableUtilisationRatesCalculator);
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      destructable = (await deployContract(user1, DestructableArtifact)) as DestructableContract;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      await pool.initialize(ratesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
    });

    it("user1 funds destructable contract with 1ETH", async () => {
      await user1.sendTransaction({to: destructable.address, value: toWei("1.0")})
    });

    it("user2 and user3 make pool related actions, year passes", async () => {
      await pool.connect(user2).deposit({value: toWei("1.0")});
      await pool.connect(user3).borrow(toWei("0.7"));

      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(0.3, 0.000001);
    });

    it("user 1 forcefully funds pool contract with 1 ETH", async () => {
      await time.increase(time.duration.years(1));

      expect(fromWei(await pool.totalSupply())).to.be.closeTo(1.098340055784504, 0.000001);
      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(0.3, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.100158427, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.137445592, 0.000001);

      await destructable.connect(user1).destruct(pool.address);

      expect(fromWei(await pool.totalSupply())).to.be.closeTo(1.098340055784504, 0.000001);
      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(1.3, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.100158427, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.13744559, 0.000001);
    });

    it("wait a year and check pool", async () => {
      await time.increase(time.duration.years(1));

      expect(fromWei(await pool.totalSupply())).to.be.closeTo(1.206350878140707, 0.000001);
      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(1.3, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.106987879, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.1410325196, 0.000001);
    });
  });

  describe('Total loans greater than total deposits', () => {
    let pool: Pool,
      owner: SignerWithAddress,
      user1: SignerWithAddress,
      user2: SignerWithAddress,
      user3: SignerWithAddress,
      ratesCalculator: VariableUtilisationRatesCalculator;

    before("Deploy Pool contract", async () => {
      [owner, user1, user2, user3] = await getFixedGasSigners(10000000);
      ratesCalculator = (await deployContract(owner, VariableUtilisationRatesCalculatorArtifact)) as VariableUtilisationRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      await pool.initialize(ratesCalculator.address, borrowersRegistry.address, ZERO, ZERO);

    });

    it("keep rates at maximum when pool utilisation is higher than 1", async () => {
      await pool.connect(user1).deposit({value: toWei("1.2")});
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("1.2", "ether"));

      await pool.connect(user2).borrow(toWei("1.09"));
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("0.11", "ether"));

      await time.increase(time.duration.years(4));


      let poolBalance = fromWei(await provider.getBalance(pool.address));
      let depositUser1 = fromWei(await pool.balanceOf(user1.address));
      let borrowedUser2 = fromWei(await pool.getBorrowed(user2.address));

      expect(depositUser1).to.be.closeTo( 6.695889075746165, 0.000001);
      expect(borrowedUser2).to.be.closeTo( 7.234377734466623, 0.000001);

      await pool.connect(user2).repay({value: toWei("7")});

      await pool.connect(user1).withdraw(toWei("6.69"));

      depositUser1 = fromWei(await pool.balanceOf(user1.address));

      expect(depositUser1).to.be.closeTo( 0.005889258660823628, 0.000001);

      expect(depositUser1).to.be.below(borrowedUser2 + poolBalance);

      await time.increase(time.duration.years(1));

      poolBalance = fromWei(await provider.getBalance(pool.address));
      depositUser1 = fromWei(await pool.balanceOf(user1.address));
      borrowedUser2 = fromWei(await pool.getBorrowed(user2.address));

      expect(depositUser1).to.be.below(borrowedUser2 + poolBalance);
      expect(fromWei(await pool.getDepositRate())).to.equal(0.75);
      expect(fromWei(await pool.getBorrowingRate())).to.equal(0.75);
    });

    it("recover residual funds", async () => {
      let poolBalance = fromWei(await provider.getBalance(pool.address));
      let totalSupply = fromWei(await pool.totalSupply());
      const toRecover = poolBalance - totalSupply;
      expect(totalSupply).to.be.closeTo(0.012467367382828578, 0.00001);
      expect(poolBalance).to.be.equal(0.42);
      expect(toRecover).to.be.closeTo(0.40753263232066816, 0.00001);
      let receiverBalanceBeforeRecover = fromWei(await provider.getBalance(user3.address));

      //diminished to account for roundings
      await pool.connect(owner).recover(toWei((toRecover - 0.000001).toString()), user3.address);

      let receiverBalanceAfterRecover = fromWei(await provider.getBalance(user3.address));

      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(0.0124674, 0.00001);
      expect(receiverBalanceAfterRecover).to.be.closeTo(receiverBalanceBeforeRecover + toRecover, 0.00001);
      await expect(pool.connect(owner).recover(toWei("0.01"), user3.address)).to.be.revertedWith("Trying to recover more residual funds than available");

      expect(fromWei(await pool.totalSupply())).to.be.closeTo(0.0124674, 0.00001);
      expect(fromWei(await pool.getDepositRate())).to.equal(0.75);
      expect(fromWei(await pool.getBorrowingRate())).to.equal(0.75);
    });

    it("check condition of pool after a year", async () => {
      await time.increase(time.duration.years(1));

      expect(fromWei(await pool.getDepositRate())).to.equal(0.75);
      expect(fromWei(await pool.getBorrowingRate())).to.equal(0.75);

      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(0.0124674, 0.00001);
      expect(fromWei(await pool.totalSupply())).to.be.closeTo(0.026393417976572575, 0.00001);
    });

    it("repay rest of loan and check pool condition", async () => {
      await pool.connect(user2).repay({value: await pool.getBorrowed(user2.address)});

      expect(fromWei(await pool.totalSupply())).to.be.closeTo(0.026393417976572575, 0.00001);
      expect(fromWei(await pool.getDepositRate())).to.closeTo(0, 0.00001);
      expect(fromWei(await pool.getBorrowingRate())).to.closeTo(0.05, 0.00001);
    });

    it("withdraw rest of deposit and check pool condition", async () => {
      await pool.connect(user1).withdraw(await pool.balanceOf(user1.address));

      expect(fromWei(await pool.totalSupply())).to.be.closeTo(0, 0.00001);
      expect(fromWei(await pool.totalBorrowed())).to.be.closeTo(0, 0.00001);
    });
  });
});
