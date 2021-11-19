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
      ratesCalculator: UtilisationRatesCalculator;

    before("Deploy Pool contract", async () => {
      [owner, user1, user2] = await getFixedGasSigners(10000000);
      ratesCalculator = (await deployContract(owner, UtilisationRatesCalculatorArtifact, [toWei("0.5"), toWei("0.05")])) as UtilisationRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      await pool.initialize(ratesCalculator.address, borrowersRegistry.address, ZERO, ZERO);

    });

    it("test", async () => {
      await pool.connect(user1).deposit({value: toWei("1.2")});
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("1.2", "ether"));

      await pool.connect(user2).borrow(toWei("1"));
      expect(await provider.getBalance(pool.address)).to.be.equal(toWei("0.2", "ether"));

      await time.increase(time.duration.years(4));

      let poolBalance = fromWei(await provider.getBalance(pool.address));
      let depositUser1 = fromWei(await pool.balanceOf(user1.address));
      let borrowedUser2 = fromWei(await pool.getBorrowed(user2.address));

      expect(depositUser1).to.be.closeTo( 5.685261377043027, 0.000001);
      expect(borrowedUser2).to.be.closeTo( 6.466704661381581 , 0.000001);

      await pool.connect(user2).repay({value: toWei("6")});

      await pool.connect(user1).withdraw(toWei("5.68"));

      depositUser1 = fromWei(await pool.balanceOf(user1.address));

      expect(depositUser1).to.be.closeTo(0.005261464291408269  , 0.000001);

      console.log('getDepositRate after operations: ', fromWei(await pool.getDepositRate()));
      console.log('getBorrowingRate after operations: ', fromWei(await pool.getBorrowingRate()));

      expect(depositUser1).to.be.below(borrowedUser2 + poolBalance);

      await time.increase(time.duration.years(1));

      // poolBalance = fromWei(await provider.getBalance(pool.address));
      // depositUser1 = fromWei(await pool.balanceOf(user1.address));
      // borrowedUser2 = fromWei(await pool.getBorrowed(user2.address));
      //
      // expect(depositUser1).to.be.below(borrowedUser2 + poolBalance);
    });
  });
});
