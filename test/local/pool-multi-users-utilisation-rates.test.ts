import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import UtilisationRatesCalculatorArtifact
  from '../../artifacts/contracts/UtilisationRatesCalculator.sol/UtilisationRatesCalculator.json';
import PoolArtifact from '../../artifacts/contracts/Pool.sol/Pool.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, getFixedGasSigners, time, toWei} from "../_helpers";
import {OpenBorrowersRegistry__factory, Pool, UtilisationRatesCalculator} from "../../typechain";

chai.use(solidity);

const {deployContract, provider} = waffle;
const ZERO = ethers.constants.AddressZero;

describe('Pool with fixed interests rates', () => {

  describe('Deposit, borrow, wait & borrow more', () => {
    let pool: Pool,
      owner: SignerWithAddress,
      user1: SignerWithAddress,
      user2: SignerWithAddress,
      user3: SignerWithAddress,
      user4: SignerWithAddress,
      ratesCalculator: UtilisationRatesCalculator;

    before("Deploy Pool contract", async () => {
      [owner, user1, user2, user3, user4] = await getFixedGasSigners(10000000);
      ratesCalculator = (await deployContract(owner, UtilisationRatesCalculatorArtifact, [toWei("0.5"), toWei("0.05")])) as UtilisationRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      await pool.initialize(ratesCalculator.address, borrowersRegistry.address, ZERO, ZERO);

    });

    it("user1 deposits", async () => {
      await pool.connect(user1).deposit({value: toWei("1.0")});
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("1", "ether"));

      expect(fromWei(await pool.balanceOf(user1.address))).to.be.closeTo(1.000000, 0.000001);
      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0, 0.000001);

      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.05, 0.000001);
    });


    it("user2 borrows", async () => {
      await pool.connect(user2).borrow(toWei("0.5"));
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("0.5", "ether"));

      expect(fromWei(await pool.balanceOf(user1.address))).to.be.closeTo(1.000000, 0.000001);
      expect(fromWei(await pool.getBorrowed(user2.address))).to.be.closeTo(0.5, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.15, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.3, 0.000001);
    });


    it("should accumulate interests for first year", async () => {
      await time.increase(time.duration.years(1));
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("0.5", "ether"));

      expect(fromWei(await pool.balanceOf(user1.address))).to.be.closeTo(1.161834, 0.000001);

      expect(fromWei(await pool.getBorrowed(user2.address))).to.be.closeTo(0.674929, 0.000001);
      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.15, 0.000001);

      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.3, 0.000001);
    });

    it("user3 deposits", async () => {
      await pool.connect(user3).deposit({value: toWei("1.0")});
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("1.5", "ether"));

      expect(fromWei(await pool.balanceOf(user1.address))).to.be.closeTo(1.161834, 0.000001);
      expect(fromWei(await pool.balanceOf(user3.address))).to.be.closeTo(1, 0.000001);
      expect(fromWei(await pool.totalSupply())).to.be.closeTo(2, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.04375, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.175, 0.000001);
    });

    it("should accumulate interests for second year", async () => {
      await time.increase(time.duration.years(1));
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("1.5", "ether"));

      expect(fromWei(await pool.balanceOf(user1.address))).to.be.closeTo(1.213792802126371, 0.000001);
      expect(fromWei(await pool.balanceOf(user3.address))).to.be.closeTo( 1.0447211419209947, 0.000001);
      expect(fromWei(await pool.getBorrowed(user2.address))).to.be.closeTo(0.8040071048536998, 0.000001);
    });

    it("user4 borrows", async () => {
      await pool.connect(user4).borrow(toWei("1"));

      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("0.5", "ether"));

      expect(fromWei(await pool.getBorrowed(user4.address))).to.be.closeTo(1, 0.000001);
      expect(fromWei(await pool.getDepositRate())).to.be.closeTo( 0.31875, 0.000001);

      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.425, 0.000001);
    });


    it("should accumulate interests for another year", async () => {
      await time.increase(time.duration.years(1));

      const poolBalance = fromWei(await provider.getBalance(pool.address));
      const depositUser1 = fromWei(await pool.balanceOf(user1.address));
      const depositUser3 = fromWei(await pool.balanceOf(user3.address));
      const borrowedUser2 = fromWei(await pool.getBorrowed(user2.address));
      const borrowedUser4 = fromWei(await pool.getBorrowed(user4.address));

      expect(depositUser1).to.be.closeTo( 1.6279658921180449, 0.000001);
      expect(depositUser3).to.be.closeTo(1.4012032094846514, 0.000001);
      expect(borrowedUser2).to.be.closeTo(1.2102177458482974, 0.000001);
      expect(borrowedUser4).to.be.closeTo(1.5052326283112025, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.31875, 0.000001);

      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.425, 0.000001);

      expect(depositUser1 + depositUser3).to.be.below(borrowedUser2 + borrowedUser4 + poolBalance);
    });

    it("user2 repays full loan", async () => {
      await pool.connect(user2).repay({value: await pool.getBorrowed(user2.address)});

      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(1.7102177500292384, 0.000001);

      expect(fromWei(await pool.getBorrowed(user2.address))).to.be.closeTo(0, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo( 0.15, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.3, 0.000001);
    });

    it("should accumulate interests for another year", async () => {
      await time.increase(time.duration.years(1));

      const poolBalance = fromWei(await provider.getBalance(pool.address));
      expect(poolBalance).to.be.closeTo(1.7102177500292384, 0.000001);

      const depositUser1 = fromWei(await pool.balanceOf(user1.address));
      const depositUser3 = fromWei(await pool.balanceOf(user3.address));
      const borrowedUser4 = fromWei(await pool.getBorrowed(user4.address));
      expect(depositUser1).to.be.closeTo( 1.7662155599806035, 0.000001);
      expect(depositUser3).to.be.closeTo(1.520195813872899, 0.000001);
      expect(borrowedUser4).to.be.closeTo(1.8914913024354991, 0.000001);

      expect(depositUser1 + depositUser3).to.be.below(borrowedUser4 + poolBalance);
    });

    it("user4 repays part of loan, user1 withdraws all deposit", async () => {
      await pool.connect(user4).repay({value: toWei("1")});

      const borrowedUser2 = fromWei(await pool.getBorrowed(user2.address));
      const borrowedUser4 = fromWei(await pool.getBorrowed(user4.address));

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(  0.12163188454181471, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.2728728295322914, 0.000001);

      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(2.7102177458482974, 0.000001);

      await pool.connect(user1).withdraw(await pool.balanceOf(user1.address));

      const depositUser1 = fromWei(await pool.balanceOf(user1.address));
      const depositUser3 = fromWei(await pool.balanceOf(user3.address));

      expect(depositUser1).to.be.closeTo( 0, 0.000001);
      expect(depositUser3).to.be.closeTo( 1.5201958245100409, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo( 0.44195294726176887, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.495745668318647, 0.000001);

      const poolBalance = fromWei(await provider.getBalance(pool.address));

      expect(poolBalance).to.be.closeTo(0.9440021703982676, 0.000001);

      expect(depositUser1 + depositUser3).to.be.below(borrowedUser2 + borrowedUser4 + poolBalance);

    });

    it("should accumulate interests for another year", async () => {
      await time.increase(time.duration.years(1));

      const poolBalance = fromWei(await provider.getBalance(pool.address));
      const depositUser1 = fromWei(await pool.balanceOf(user1.address));
      const depositUser3 = fromWei(await pool.balanceOf(user3.address));
      const borrowedUser2 = fromWei(await pool.getBorrowed(user2.address));
      const borrowedUser4 = fromWei(await pool.getBorrowed(user4.address));

      expect(depositUser1).to.be.closeTo( 0, 0.000001);
      expect(depositUser3).to.be.closeTo(2.3650333341504504, 0.000001);
      expect(borrowedUser2).to.be.closeTo(0, 0.000001);
      expect(borrowedUser4).to.be.closeTo(1.463580835899401, 0.000001);

      expect(depositUser1 + depositUser3).to.be.below(borrowedUser2 + borrowedUser4 + poolBalance);
    });
  });
});
