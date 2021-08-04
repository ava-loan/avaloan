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
import {fromWei, getFixedGasSigners, time, toBytes32, toWei} from "./_helpers";
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
const ZERO = ethers.constants.AddressZero;

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
      [owner, oracle, depositor, liquidator] = await getFixedGasSigners(10000000);

      provider = (await deployContract(owner, SimplePriceProviderArtifact)) as SimplePriceProvider;
      await provider.setOracle(oracle.address);

      exchange = (await deployContract(owner, SimpleAssetsExchangeArtifact)) as SimpleAssetsExchange;
      await exchange.setPriceProvider(provider.address);
    });

    it("should deploy a pool", async () => {
      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});

      loan = (await deployContract(owner, SmartLoanArtifact, [provider.address, exchange.address, pool.address])) as SmartLoan;
    });

    it("should fund a loan", async () => {
      expect(fromWei(await loan.getTotalValue())).to.be.equal(0);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");

      await loan.fund({value: toWei("200")});

      expect(fromWei(await loan.getTotalValue())).to.be.equal(200);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");
    });

    it("should withdraw part of funds", async () => {
      await loan.withdraw(toWei("100"));

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

    it("should provide assets balances and prices", async () => {
      let balances = await loan.getAllAssetsBalances();
      expect(fromWei(balances[0])).to.be.equal(100);

      let prices = await loan.getAllAssetsPrices();
      expect(fromWei(prices[0])).to.be.equal(0.5);
    });

    it("should update valuation after price change", async () => {
      await provider.connect(oracle).setPrice(toBytes32('USD'), toWei("0.1"));

      expect(fromWei(await loan.getAssetValue(toBytes32('USD')))).to.be.equal(10);

      expect(fromWei(await loan.getTotalValue())).to.be.equal(60);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");
    });

    it("should redeem investment", async () => {
      await loan.redeem(toBytes32('USD'), toWei("100"));

      expect(fromWei(await loan.getAssetValue(toBytes32('USD')))).to.be.equal(0);

      expect(fromWei(await loan.getTotalValue())).to.be.equal(60);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("10000");
    });

  });

  describe('A loan with debt and repayment', () => {
    let provider: SimplePriceProvider,
      exchange: SimpleAssetsExchange,
      loan: SmartLoan,
      pool: Pool,
      owner: SignerWithAddress,
      oracle: SignerWithAddress,
      depositor: SignerWithAddress,
      liquidator: SignerWithAddress;

    before("deploy the Smart Loan", async () => {
      [owner, oracle, depositor, liquidator] = await getFixedGasSigners(10000000);

      provider = (await deployContract(owner, SimplePriceProviderArtifact)) as SimplePriceProvider;
      await provider.setOracle(oracle.address);

      exchange = (await deployContract(owner, SimpleAssetsExchangeArtifact)) as SimpleAssetsExchange;
      await exchange.setPriceProvider(provider.address);
    });


    it("should deploy a pool", async () => {
      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
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


    it("should borrow funds", async () => {
      await loan.borrow(toWei("200"));

      expect(fromWei(await loan.getTotalValue())).to.be.equal(300);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(200, 0.1);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("1500");
    });


    it("should repay funds", async () => {
      await loan.repay(toWei("100"));

      expect(fromWei(await loan.getTotalValue())).to.be.equal(200);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(100, 0.1);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("1999");
    });


    it("should prevent borrowing too much", async () => {
      await expect(loan.borrow(toWei("500"))).to.be.revertedWith("The action may cause an account to become insolvent");
    });

  });

  describe('A loan with liquidation', () => {
    let provider: SimplePriceProvider,
      exchange: SimpleAssetsExchange,
      loan: SmartLoan,
      pool: Pool,
      owner: SignerWithAddress,
      oracle: SignerWithAddress,
      depositor: SignerWithAddress,
      liquidator: SignerWithAddress;


    before("deploy the Smart Loan", async () => {
      [owner, oracle, depositor, liquidator] = await getFixedGasSigners(10000000);

      provider = (await deployContract(owner, SimplePriceProviderArtifact)) as SimplePriceProvider;
      await provider.setOracle(oracle.address);

      exchange = (await deployContract(owner, SimpleAssetsExchangeArtifact)) as SimpleAssetsExchange;
      await exchange.setPriceProvider(provider.address);
    });


    it("should deploy a pool", async () => {
      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});

      loan = (await deployContract(owner, SmartLoanArtifact, [provider.address, exchange.address, pool.address])) as SmartLoan;
    });

    it("should fund a loan", async () => {
      await loan.fund({value: toWei("100")});
    });

    it("should borrow funds", async () => {
      await loan.borrow(toWei("400"));

      expect(fromWei(await loan.getTotalValue())).to.be.equal(500);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(400, 0.1);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("1250");
    });

    it("should invest", async () => {
      await provider.connect(oracle).setPrice(toBytes32('USD'), toWei("0.5"));
      await loan.invest(toBytes32('USD'), toWei("100"));
    });

    it("should update valuation after price change", async () => {
      await provider.connect(oracle).setPrice(toBytes32('USD'), toWei("0.1"));

      expect(fromWei(await loan.getAssetValue(toBytes32('USD')))).to.be.equal(10);

      expect(fromWei(await loan.getTotalValue())).to.be.equal(460);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(400, 0.1);
      expect((await loan.getSolvencyRatio()).toString()).to.be.equal("1149");
    });


    it("should liquidate", async () => {
      expect(await loan.isSolvent()).to.be.false;
      expect(fromWei(await loan.getTotalValue())).to.be.equal(460);

      await loan.connect(liquidator).liquidate(toWei("300"));

      //Liquidator bonus was 10% of 300 = 30
      expect(fromWei(await loan.getTotalValue())).to.be.equal(130);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(100, 0.1);
      expect(await loan.isSolvent()).to.be.true;

    });

  });

});

