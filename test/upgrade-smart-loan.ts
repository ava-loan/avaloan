import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import FixedRatesCalculatorArtifact from '../artifacts/contracts/FixedRatesCalculator.sol/FixedRatesCalculator.json';
import PoolArtifact from '../artifacts/contracts/Pool.sol/Pool.json';
import OpenBorrowersRegistryArtifact
  from '../artifacts/contracts/OpenBorrowersRegistry.sol/OpenBorrowersRegistry.json';
import SimplePriceProviderArtifact from '../artifacts/contracts/SimplePriceProvider.sol/SimplePriceProvider.json';
import SimpleAssetsExchangeArtifact from '../artifacts/contracts/SimpleAssetsExchange.sol/SimpleAssetsExchange.json';
import SmartLoanArtifact from '../artifacts/contracts/SmartLoan.sol/SmartLoan.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, time, toBytes32, toWei} from "./_helpers";
import {
  FixedRatesCalculator,
  OpenBorrowersRegistry,
  Pool,
  SimpleAssetsExchange,
  SimplePriceProvider,
  SmartLoan,
  UpgradeableBeacon,
  BeaconProxy,
  SmartLoan__factory
} from "../typechain";

import {CompoundingIndex__factory, OpenBorrowersRegistry__factory} from "../typechain";
import {UpgradeableBeacon__factory, BeaconProxy__factory, MockUpgradedSmartLoan__factory} from "../typechain";

chai.use(solidity);

const {deployContract, provider} = waffle;

describe('Smart loan - upgrading', () => {

  describe('Check basic logic before and after upgrade', () => {
    let provider: SimplePriceProvider,
      exchange: SimpleAssetsExchange,
      loan: SmartLoan,
      pool: Pool,
      owner: SignerWithAddress,
      oracle: SignerWithAddress,
      depositor: SignerWithAddress,
      other: SignerWithAddress,
      beacon: UpgradeableBeacon;

    before("should deploy provider, exchange and pool", async () => {
      [owner, oracle, depositor, other] = await ethers.getSigners();

      provider = (await deployContract(owner, SimplePriceProviderArtifact)) as SimplePriceProvider;
      await provider.setOracle(oracle.address);

      exchange = (await deployContract(owner, SimpleAssetsExchangeArtifact)) as SimpleAssetsExchange;
      await exchange.setPriceProvider(provider.address);

      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());
      const depositIndex = await (new CompoundingIndex__factory(owner).deploy(pool.address));
      const borrowIndex = await (new CompoundingIndex__factory(owner).deploy(pool.address));
        
      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, depositIndex.address, borrowIndex.address);
      await pool.connect(depositor).deposit({value: toWei("1000")});
    });

    it("should deploy a loan", async () => {
      loan = (await deployContract(owner, SmartLoanArtifact)) as SmartLoan;
      beacon = await (new UpgradeableBeacon__factory(owner).deploy(loan.address));
      let proxy = await (new BeaconProxy__factory(owner).deploy(beacon.address, []));
      loan = await (new SmartLoan__factory(owner).attach(proxy.address));
      await loan.initialize(provider.address, exchange.address, pool.address);
    });


    it("should fund a loan", async () => {
      expect(fromWei(await loan.getTotalValue())).to.be.equal(0);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");

      await loan.fund({value: toWei("100")});

      expect(fromWei(await loan.getTotalValue())).to.be.equal(100);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");
    });


    it("should buy asset", async () => {
      await provider.connect(oracle).setPrice(toBytes32('USD'), toWei("0.5"));
      await loan.invest(toBytes32('USD'), toWei("100"));

      expect(fromWei(await loan.getAssetValue(toBytes32('USD')))).to.be.equal(50);

      expect(fromWei(await loan.getTotalValue())).to.be.equal(100);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");
    }); 
    

    it("should not allow to upgrade from non-owner", async () => {
      await expect(beacon.connect(other).upgradeTo(other.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });


    it("should upgrade", async () => {
      let loanV2 = await (new MockUpgradedSmartLoan__factory(owner).deploy());

      await beacon.upgradeTo(loanV2.address);

      //The mock loan has a hardcoded total value of 777
      expect(await loan.getTotalValue()).to.be.equal(777);
    });

  });


});

