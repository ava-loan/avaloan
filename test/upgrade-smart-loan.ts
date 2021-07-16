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
  SimplePriceProvider, SmartLoan
} from "../typechain";

import {CompoundingIndex__factory, OpenBorrowersRegistry__factory} from "../typechain";

chai.use(solidity);

const {deployContract, provider} = waffle;

describe('Smart loan', () => {

  describe('A loan without debt', () => {
    let provider: SimplePriceProvider,
      exchange: SimpleAssetsExchange,
      loan: SmartLoan,
      pool: Pool,
      owner: SignerWithAddress,
      oracle: SignerWithAddress,
      depositor: SignerWithAddress,
      liquidator: SignerWithAddress;

    before("deploy the Smart Loan", async () => {
      [owner, oracle, depositor, liquidator] = await ethers.getSigners();

      provider = (await deployContract(owner, SimplePriceProviderArtifact)) as SimplePriceProvider;
      await provider.setOracle(oracle.address);

      exchange = (await deployContract(owner, SimpleAssetsExchangeArtifact)) as SimpleAssetsExchange;
      await exchange.setPriceProvider(provider.address);
    });

    it("should deploy a pool", async () => {
      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());
      const depositIndex = await (new CompoundingIndex__factory(owner).deploy(pool.address));
      const borrowIndex = await (new CompoundingIndex__factory(owner).deploy(pool.address));
        
      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, depositIndex.address, borrowIndex.address);
      await pool.connect(depositor).deposit({value: toWei("1000")});

      loan = (await deployContract(owner, SmartLoanArtifact, [provider.address, exchange.address, pool.address])) as SmartLoan;
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

  });


});

