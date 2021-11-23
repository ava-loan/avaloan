import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import VariableUtilisationRatesCalculatorArtifact
  from '../../artifacts/contracts/VariableUtilisationRatesCalculator.sol/VariableUtilisationRatesCalculator.json';
import PoolArtifact from '../../artifacts/contracts/Pool.sol/Pool.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, getFixedGasSigners, time, toWei} from "../_helpers";
import {
  OpenBorrowersRegistry__factory,
  Pool,
  VariableUtilisationRatesCalculator
} from "../../typechain";

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
      ratesCalculator: VariableUtilisationRatesCalculator;

    before("Deploy Pool contract", async () => {
      [owner, user1, user2, user3, user4] = await getFixedGasSigners(10000000);
      ratesCalculator = (await deployContract(owner, VariableUtilisationRatesCalculatorArtifact) as VariableUtilisationRatesCalculator);
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      await pool.initialize(ratesCalculator.address, borrowersRegistry.address, ZERO, ZERO);

    });

    it("user1 deposits", async () => {
      await pool.connect(user1).deposit({value: toWei("1.0")});
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("1", "ether"));

      expect(fromWei(await pool.getDeposits(user1.address))).to.be.closeTo(1.000000, 0.000001);
      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0, 0.000001);

      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.05, 0.000001);
    });


    it("user2 borrows", async () => {
      await pool.connect(user2).borrow(toWei("0.9"));
      expect(fromWei(await provider.getBalance(pool.address))).to.be.equal(0.1);

      expect(fromWei(await pool.getDeposits(user1.address))).to.be.closeTo(1.000000, 0.000001);
      expect(fromWei(await pool.getBorrowed(user2.address))).to.be.closeTo(0.9, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.4032, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.448 , 0.000001);
    });


    it("should accumulate interests for first year", async () => {
      await time.increase(time.duration.years(1));
      expect(fromWei(await provider.getBalance(pool.address))).to.be.equal(0.1);

      expect(fromWei(await pool.getDeposits(user1.address))).to.be.closeTo(1.4966061791124947, 0.000001);

      expect(fromWei(await pool.getBorrowed(user2.address))).to.be.closeTo(1.408660821605612, 0.000001);
      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.4032, 0.000001);

      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.448, 0.000001);
    });

    it("user3 deposits", async () => {
      await pool.connect(user3).deposit({value: toWei("1.0")});
      expect(fromWei(await provider.getBalance(pool.address))).to.be.equal(1.1);

      expect(fromWei(await pool.getDeposits(user1.address))).to.be.closeTo(1.4966061982471854, 0.000001);
      expect(fromWei(await pool.getDeposits(user3.address))).to.be.closeTo(1, 0.000001);
      expect(fromWei(await pool.totalDeposited())).to.be.closeTo(2, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.0468, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.104, 0.000001);
    });

    it("should accumulate interests for second year", async () => {
      await time.increase(time.duration.years(1));
      expect(fromWei(await provider.getBalance(pool.address))).to.be.equal(1.1);

      expect(fromWei(await pool.getDeposits(user1.address))).to.be.closeTo(1.5683122014448092, 0.000001);
      expect(fromWei(await pool.getDeposits(user3.address))).to.be.closeTo( 1.0479124056024927, 0.000001);
      expect(fromWei(await pool.getBorrowed(user2.address))).to.be.closeTo(1.5630507326166585, 0.000001);
    });

    it("user4 borrows", async () => {
      await pool.connect(user4).borrow(toWei("1"));

      expect(fromWei(await provider.getBalance(pool.address))).to.be.equal(0.1);

      expect(fromWei(await pool.getBorrowed(user4.address))).to.be.closeTo(1, 0.000001);
      expect(fromWei(await pool.getDepositRate())).to.be.closeTo( 0.56905, 0.000001);

      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.599, 0.000001);
    });


    it("should accumulate interests for another year", async () => {
      await time.increase(time.duration.years(1));

      const poolBalance = fromWei(await provider.getBalance(pool.address));
      const depositUser1 = fromWei(await pool.getDeposits(user1.address));
      const depositUser3 = fromWei(await pool.getDeposits(user3.address));
      const borrowedUser2 = fromWei(await pool.getBorrowed(user2.address));
      const borrowedUser4 = fromWei(await pool.getBorrowed(user4.address));

      expect(depositUser1).to.be.closeTo( 2.7705614980189877, 0.000001);
      expect(depositUser3).to.be.closeTo(1.8512295026287662, 0.000001);
      expect(borrowedUser2).to.be.closeTo(2.845217478493884, 0.000001);
      expect(borrowedUser4).to.be.closeTo(1.8202975819906857, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.56905, 0.000001);

      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.599, 0.000001);

      expect(depositUser1 + depositUser3).to.be.below(borrowedUser2 + borrowedUser4 + poolBalance);
    });

    it("user2 repays full loan", async () => {
      await pool.connect(user2).repay({value: await pool.getBorrowed(user2.address)});

      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(2.945217438074762, 0.000001);

      expect(fromWei(await pool.getBorrowed(user2.address))).to.be.closeTo(0, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo( 0.055000000262438495, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.1100000001852507, 0.000001);
    });

    it("should accumulate interests for another year", async () => {
      await time.increase(time.duration.years(1));

      const poolBalance = fromWei(await provider.getBalance(pool.address));
      expect(poolBalance).to.be.closeTo( 2.945217438074762, 0.000001);

      const depositUser1 = fromWei(await pool.getDeposits(user1.address));
      const depositUser3 = fromWei(await pool.getDeposits(user3.address));
      const borrowedUser4 = fromWei(await pool.getBorrowed(user4.address));
      expect(depositUser1).to.be.closeTo( 2.9272108670591868, 0.000001);
      expect(depositUser3).to.be.closeTo(1.9558991689148113, 0.000001);
      expect(borrowedUser4).to.be.closeTo(2.031958317279774, 0.000001);

      expect(depositUser1 + depositUser3).to.be.below(borrowedUser4 + poolBalance);
    });

    it("user4 repays part of loan, user1 withdraws all deposit", async () => {
      await pool.connect(user4).repay({value: toWei("1")});

      const borrowedUser2 = fromWei(await pool.getBorrowed(user2.address));
      const borrowedUser4 = fromWei(await pool.getBorrowed(user4.address));

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(  0.05774710230336199, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.11191750502031714, 0.000001);

      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(3.9452174784938836, 0.000001);

      await pool.connect(user1).withdraw(await pool.getDeposits(user1.address));

      const depositUser1 = fromWei(await pool.getDeposits(user1.address));
      const depositUser3 = fromWei(await pool.getDeposits(user3.address));

      expect(depositUser1).to.be.closeTo( 0, 0.000001);
      expect(depositUser3).to.be.closeTo( 1.9558991724963533, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo( 0.8735676582493901, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.8465144026509518, 0.000001);

      const poolBalance = fromWei(await provider.getBalance(pool.address));

      expect(poolBalance).to.be.closeTo(1.018006618730337, 0.000001);

      expect(depositUser1 + depositUser3).to.be.below(borrowedUser2 + borrowedUser4 + poolBalance);
    });

    // it("should accumulate interests for another year", async () => {
    //   await time.increase(time.duration.years(1));
    //
    //   const poolBalance = fromWei(await provider.getBalance(pool.address));
    //   const depositUser1 = fromWei(await pool.getDeposits(user1.address));
    //   const depositUser3 = fromWei(await pool.getDeposits(user3.address));
    //   const borrowedUser2 = fromWei(await pool.getBorrowed(user2.address));
    //   const borrowedUser4 = fromWei(await pool.getBorrowed(user4.address));
    //
    //   expect(depositUser1).to.be.closeTo( 0, 0.000001);
    //   expect(depositUser3).to.be.closeTo(4.685241752170689, 0.000001);
    //   expect(borrowedUser2).to.be.closeTo(0, 0.000001);
    //   expect(borrowedUser4).to.be.closeTo(2.4060171413863753, 0.000001);
    //
    //   expect(depositUser1 + depositUser3).to.be.below(borrowedUser2 + borrowedUser4 + poolBalance);
    // });
  });
});
