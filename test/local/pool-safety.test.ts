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

    before("Deploy Pool contract and destructable contract used to force funding", async () => {
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

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.0938, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.134, 0.000001);

      await destructable.connect(user1).destruct(pool.address);

      expect(fromWei(await pool.totalSupply())).to.be.closeTo(1.098340055784504, 0.000001);
      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(1.3, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.0938, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.134, 0.000001);
    });

    it("wait a year and check pool", async () => {
      await time.increase(time.duration.years(1));

      expect(fromWei(await pool.totalSupply())).to.be.closeTo(1.206350878140707, 0.000001);
      expect(fromWei(await provider.getBalance(pool.address))).to.be.closeTo(1.3, 0.000001);

      expect(fromWei(await pool.getDepositRate())).to.be.closeTo(0.0938, 0.000001);
      expect(fromWei(await pool.getBorrowingRate())).to.be.closeTo(0.134, 0.000001);
    });
  });
});
