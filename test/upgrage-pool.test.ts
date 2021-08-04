import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import FixedRatesCalculatorArtifact from '../artifacts/contracts/FixedRatesCalculator.sol/FixedRatesCalculator.json';
import PoolArtifact from '../artifacts/contracts/Pool.sol/Pool.json';
import OpenBorrowersRegistryArtifact
  from '../artifacts/contracts/OpenBorrowersRegistry.sol/OpenBorrowersRegistry.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, getFixedGasSigners, time, toWei} from "./_helpers";
import {CompoundingIndex, FixedRatesCalculator, OpenBorrowersRegistry, Pool, TransparentUpgradeableProxy} from "../typechain";
import {CompoundingIndex__factory, TransparentUpgradeableProxy__factory, Pool__factory, MockUpgradedPool__factory} from "../typechain";

chai.use(solidity);

const {deployContract, provider} = waffle;
const ZERO = ethers.constants.AddressZero;

describe('Upgreadable pool', () => {

  describe('', () => {
    let pool: Pool,
      owner: SignerWithAddress,
      depositor: SignerWithAddress,
      depositor2: SignerWithAddress,
      borrower: SignerWithAddress,
      admin: SignerWithAddress,
      fixedRatesCalculator: FixedRatesCalculator,
      depositIndex: CompoundingIndex,
      borrowIndex: CompoundingIndex,
      borrowersRegistry: OpenBorrowersRegistry,
      proxy: TransparentUpgradeableProxy;

    it("should depoloy a contract behind a proxy", async () => {
      [owner, depositor, borrower, admin, depositor2] = await getFixedGasSigners(10000000);
      pool = (await deployContract(owner, PoolArtifact)) as Pool;

      proxy = await (new TransparentUpgradeableProxy__factory(owner).deploy(pool.address, admin.address, []));
      pool = await (new Pool__factory(owner).attach(proxy.address));

      fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      borrowersRegistry = (await deployContract(owner, OpenBorrowersRegistryArtifact)) as OpenBorrowersRegistry;

      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
    });


    it("should deposit and borrow using proxy", async () => {
      await pool.connect(depositor).deposit({value: toWei("1.0")});
      expect(fromWei(await pool.getDeposits(depositor.address))).to.be.closeTo(1, 0.000001);

      await pool.connect(borrower).borrow(toWei("0.5"));
      expect(fromWei(await pool.getBorrowed(borrower.address))).to.be.closeTo(0.5, 0.000001);
    });


    it("should prevent non admin from upgrade", async () => {
      let mockUpgradedPool = await (new MockUpgradedPool__factory(owner).deploy());
      await expect(proxy.connect(owner).upgradeTo(mockUpgradedPool.address))
        .to.be.revertedWith("Transaction reverted: function selector was not recognized and there's no fallback function");
    });


    it("should upgrade keeping old state", async () => {
      let mockUpgradedPool = await (new MockUpgradedPool__factory(owner).deploy());

      await proxy.connect(admin).upgradeTo(mockUpgradedPool.address);

      expect(fromWei(await pool.getDeposits(depositor.address))).to.be.closeTo(1, 0.000001);
      expect(fromWei(await pool.getBorrowed(borrower.address))).to.be.closeTo(0.5, 0.000001);
    });


    it("should have new logic after upgrade", async () => {
      //Upgraded logic doubles deposits value
      await pool.connect(depositor2).deposit({value: toWei("1.0")});
      expect(fromWei(await pool.getDeposits(depositor2.address))).to.be.closeTo(2, 0.000001);
    });

  });

});
