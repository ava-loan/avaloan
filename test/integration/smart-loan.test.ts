import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import FixedRatesCalculatorArtifact from '../../artifacts/contracts/FixedRatesCalculator.sol/FixedRatesCalculator.json';
import PoolArtifact from '../../artifacts/contracts/Pool.sol/Pool.json';
import SimplePriceProviderArtifact from '../../artifacts/contracts/SimplePriceProvider.sol/SimplePriceProvider.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {
  fromWei,
  getFixedGasSigners,
  toBytes32,
  toWei,
  formatUnits,
  deployAndInitPangolinExchangeContract
} from "../_helpers";
import {
  FixedRatesCalculator,
  PangolinExchange,
  Pool,
  SimplePriceProvider, SmartLoan, SmartLoan__factory
} from "../../typechain";

import {OpenBorrowersRegistry__factory} from "../../typechain";
import {BigNumber, Contract} from "ethers";

chai.use(solidity);

const {deployContract, provider} = waffle;
const ZERO = ethers.constants.AddressZero;
const pangolinRouterAddress = '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106';
const usdTokenAddress = '0xc7198437980c041c805a1edcba50c1ce5db95118';
const erc20ABI = [
  'function decimals() public view returns (uint8)',
  'function balanceOf(address _owner) public view returns (uint256 balance)',
  'function approve(address _spender, uint256 _value) public returns (bool success)',
  'function allowance(address owner, address spender) public view returns (uint256)'
]


describe('Smart loan', () => {

  describe('A loan without debt', () => {
    let priceProvider: SimplePriceProvider,
      exchange: PangolinExchange,
      loan: SmartLoan,
      pool: Pool,
      owner: SignerWithAddress,
      oracle: SignerWithAddress,
      depositor: SignerWithAddress,
      liquidator: SignerWithAddress,
      usdTokenContract: Contract,
      usdTokenDecimalPlaces: BigNumber;

    before("deploy provider, exchange and pool", async () => {
      [owner, oracle, depositor, liquidator] = await getFixedGasSigners(10000000);

      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      priceProvider = (await deployContract(owner, SimplePriceProviderArtifact)) as SimplePriceProvider;
      usdTokenContract = new ethers.Contract(usdTokenAddress, erc20ABI, provider);
      exchange = await deployAndInitPangolinExchangeContract(owner, pangolinRouterAddress);
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      await priceProvider.setOracle(oracle.address);
      usdTokenDecimalPlaces = await usdTokenContract.decimals();

      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});
    });

    it("should deploy a smart loan", async () => {
      loan = await (new SmartLoan__factory(owner).deploy());
      await loan.initialize(priceProvider.address, exchange.address, pool.address);
    });

    it("should fund a loan", async () => {
      expect(fromWei(await loan.getTotalValue())).to.be.equal(0);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect(await loan.getSolvencyRatio()).to.be.equal(10000);

      await loan.fund({value: toWei("200")});

      expect(fromWei(await loan.getTotalValue())).to.be.equal(200);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect(await loan.getSolvencyRatio()).to.be.equal(10000);
    });

    it("should withdraw part of funds", async () => {
      await loan.withdraw(toWei("100"));

      expect(fromWei(await loan.getTotalValue())).to.be.equal(100);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect(await loan.getSolvencyRatio()).to.be.equal(10000);
    });

    it("should buy asset", async () => {
      const estimatedAVAXPriceFor1USDToken = await exchange.getEstimatedAVAXForERC20Token(toWei("1", usdTokenDecimalPlaces), usdTokenAddress);
      await priceProvider.connect(oracle).setPrice(toBytes32('USD'), estimatedAVAXPriceFor1USDToken);

      await loan.invest(toBytes32('USD'), toWei("100", usdTokenDecimalPlaces));

      const expectedAssetValue = estimatedAVAXPriceFor1USDToken.mul("100")

      expect(await loan.getAssetValue(toBytes32('USD'))).to.be.equal(expectedAssetValue);

      expect(fromWei(await loan.getTotalValue())).to.be.closeTo(100, 0.00001);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect(await loan.getSolvencyRatio()).to.be.equal(10000);
    });

    it("should provide assets balances and prices", async () => {
      const estimatedAVAXPriceFor1USDToken = await exchange.getEstimatedAVAXForERC20Token(toWei("1", usdTokenDecimalPlaces), usdTokenAddress);
      const usdTokenBalance = (await loan.getAllAssetsBalances())[0];
      expect(formatUnits(usdTokenBalance, usdTokenDecimalPlaces)).to.be.equal(100);

      const usdTokenPrice = (await loan.getAllAssetsPrices())[0];
      expect(fromWei(usdTokenPrice)).to.be.closeTo(fromWei(estimatedAVAXPriceFor1USDToken), 0.000001);
    });


    it("should update valuation after price change", async () => {
      const initialUSDTokenPrice = await priceProvider.connect(owner).getPrice(toBytes32('USD'));
      const initialUSDTokenAssetValue = await loan.getAssetValue(toBytes32('USD'));
      const initialLoanTotalValue = await loan.getTotalValue();

      const newUSDTokenPrice = initialUSDTokenPrice.mul(2);
      const expectedUSDTokenValue = initialUSDTokenAssetValue.mul(2);
      const usdTokenValueDifference = expectedUSDTokenValue.sub(initialUSDTokenAssetValue);

      await priceProvider.connect(oracle).setPrice(toBytes32('USD'), newUSDTokenPrice);

      expect(await loan.getAssetValue(toBytes32('USD'))).to.be.equal(expectedUSDTokenValue);
      expect(await loan.getTotalValue()).to.be.equal(initialLoanTotalValue.add(usdTokenValueDifference));
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect(await loan.getSolvencyRatio()).to.be.equal(10000);
    });


    it("should redeem investment", async () => {
      const initialUSDTokenBalance = (await loan.getAllAssetsBalances())[0];
      const estimatedAVAXReceivedFor1USDToken = await exchange.getEstimatedERC20TokenForAVAX(toWei("1", usdTokenDecimalPlaces), usdTokenAddress);

      await priceProvider.connect(oracle).setPrice(toBytes32('USD'), estimatedAVAXReceivedFor1USDToken);
      await loan.redeem(toBytes32('USD'), initialUSDTokenBalance);

      const currentUSDTokenBalance = (await loan.getAllAssetsBalances())[0];

      expect(currentUSDTokenBalance).to.be.equal(0);
      expect(fromWei(await loan.getAssetValue(toBytes32('USD')))).to.be.equal(0);

      const currentLoanTotalValue = await loan.getTotalValue();

      // TODO: Refactor this using the .to.be.closeTo (delta 0.001) after resolving argument types issues
      const lowerExpectedBound = currentLoanTotalValue.mul(999).div(1000);
      const upperExpectedBound = currentLoanTotalValue.mul(1001).div(1000);
      expect(currentLoanTotalValue).to.be.gte(lowerExpectedBound);
      expect(currentLoanTotalValue).to.be.lte(upperExpectedBound);

      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect(await loan.getSolvencyRatio()).to.be.equal(10000);
    });

  });

  describe('A loan with debt and repayment', () => {
    let priceProvider: SimplePriceProvider,
      exchange: PangolinExchange,
      loan: SmartLoan,
      pool: Pool,
      owner: SignerWithAddress,
      oracle: SignerWithAddress,
      depositor: SignerWithAddress,
      liquidator: SignerWithAddress,
      usdTokenContract: Contract,
      usdTokenDecimalPlaces: BigNumber;

    before("deploy provider, exchange and pool", async () => {
      [owner, oracle, depositor, liquidator] = await getFixedGasSigners(10000000);

      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      priceProvider = (await deployContract(owner, SimplePriceProviderArtifact)) as SimplePriceProvider;
      usdTokenContract = new ethers.Contract(usdTokenAddress, erc20ABI, provider);
      exchange = await deployAndInitPangolinExchangeContract(owner, pangolinRouterAddress);

      await priceProvider.setOracle(oracle.address);
      usdTokenDecimalPlaces = await usdTokenContract.decimals();
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());
      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});
    });

    it("should deploy a smart loan", async () => {
      loan = await (new SmartLoan__factory(owner).deploy());
      await loan.initialize(priceProvider.address, exchange.address, pool.address);
    });


    it("should fund a loan", async () => {
      expect(fromWei(await loan.getTotalValue())).to.be.equal(0);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect(await loan.getSolvencyRatio()).to.be.equal(10000);

      await loan.fund({value: toWei("100")});

      expect(fromWei(await loan.getTotalValue())).to.be.equal(100);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect(await loan.getSolvencyRatio()).to.be.equal(10000);
    });


    it("should borrow funds", async () => {
      await loan.borrow(toWei("200"));

      expect(fromWei(await loan.getTotalValue())).to.be.equal(300);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(200, 0.1);
      expect(await loan.getSolvencyRatio()).to.be.equal(1500);
    });


    it("should repay funds", async () => {
      await loan.repay(toWei("100"));

      expect(fromWei(await loan.getTotalValue())).to.be.equal(200);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(100, 0.1);
      expect(await loan.getSolvencyRatio()).to.be.equal(1999);
    });


    it("should prevent borrowing too much", async () => {
      await expect(loan.borrow(toWei("500"))).to.be.revertedWith("The action may cause an account to become insolvent");
    });

  });

  describe('A loan with liquidation', () => {
    let priceProvider: SimplePriceProvider,
      exchange: PangolinExchange,
      loan: SmartLoan,
      pool: Pool,
      owner: SignerWithAddress,
      oracle: SignerWithAddress,
      depositor: SignerWithAddress,
      liquidator: SignerWithAddress,
      usdTokenContract: Contract,
      usdTokenDecimalPlaces: BigNumber;


    before("deploy provider, exchange and pool", async () => {
      [owner, oracle, depositor, liquidator] = await getFixedGasSigners(10000000);

      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      priceProvider = (await deployContract(owner, SimplePriceProviderArtifact)) as SimplePriceProvider;
      usdTokenContract = new ethers.Contract(usdTokenAddress, erc20ABI, provider);
      exchange = await deployAndInitPangolinExchangeContract(owner, pangolinRouterAddress);

      await priceProvider.setOracle(oracle.address);
      usdTokenDecimalPlaces = await usdTokenContract.decimals();
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());
      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});
    });

    it("should deploy a smart loan", async () => {
      loan = await (new SmartLoan__factory(owner).deploy());
      await loan.initialize(priceProvider.address, exchange.address, pool.address);
    });

    it("should fund a loan", async () => {
      await loan.fund({value: toWei("100")});
    });

    it("should borrow funds", async () => {
      await loan.borrow(toWei("400"));

      expect(fromWei(await loan.getTotalValue())).to.be.equal(500);
      expect(fromWei(await loan.getDebt())).to.be.closeTo(400, 0.1);
      expect(await loan.getSolvencyRatio()).to.be.equal(1250);
    });

    it("should invest", async () => {
      const estimatedAVAXPriceFor1USDToken = await exchange.getEstimatedAVAXForERC20Token(toWei("1", usdTokenDecimalPlaces), usdTokenAddress);
      await priceProvider.connect(oracle).setPrice(toBytes32('USD'), estimatedAVAXPriceFor1USDToken);


      await loan.invest(toBytes32('USD'), toWei("1700", usdTokenDecimalPlaces));

      const currentUSDTokenBalance = (await loan.getAllAssetsBalances())[0];
      expect(currentUSDTokenBalance).to.be.equal(toWei("1700", usdTokenDecimalPlaces));
    });

    it("should update valuation after price change", async () => {
      const loanAVAXValue = await provider.getBalance(loan.address);
      const USDTokenBalance = (await loan.getAllAssetsBalances())[0];
      const initialUSDTokenPrice = await priceProvider.connect(owner).getPrice(toBytes32('USD'));
      const newUSDTokenPrice = initialUSDTokenPrice.div(10);

      await priceProvider.connect(oracle).setPrice(toBytes32('USD'), newUSDTokenPrice);

      const usdTokenAssetValue = await loan.getAssetValue(toBytes32('USD'));
      const expectedUSDTokenAssetValue = newUSDTokenPrice.mul(formatUnits(USDTokenBalance, usdTokenDecimalPlaces));

      expect(usdTokenAssetValue).to.be.equal((expectedUSDTokenAssetValue));

      const currentLoanTotalValue = await loan.getTotalValue();
      const currentLoanDebt = await loan.getDebt();

      expect(currentLoanTotalValue).to.be.equal(loanAVAXValue.add(usdTokenAssetValue));
      expect(fromWei(currentLoanDebt)).to.be.closeTo(400, 0.1);

      const expectedSolvencyRation = currentLoanTotalValue.mul(1000).div(currentLoanDebt);

      expect(await loan.getSolvencyRatio()).to.be.equal(expectedSolvencyRation);
    });


    it("should liquidate", async () => {
      expect(await loan.isSolvent()).to.be.false;

      const initialLoanAVAXValue = await provider.getBalance(loan.address);
      const initialUSDTokenAssetValue = await loan.getAssetValue(toBytes32('USD'));

      expect(await loan.getTotalValue()).to.be.equal(initialLoanAVAXValue.add(initialUSDTokenAssetValue));

      await loan.connect(liquidator).liquidate(toWei("200"));

      const currentUSDTokenAssetValue = await loan.getAssetValue(toBytes32('USD'));
      const currentLoanAVAXValue = await provider.getBalance(loan.address);

      //Liquidator bonus was 10% of 200 = 20
      expect(currentLoanAVAXValue).to.be.equal(initialLoanAVAXValue.sub(toWei("220")));
      expect(await loan.getTotalValue()).to.be.equal(currentLoanAVAXValue.add(currentUSDTokenAssetValue));
      expect(fromWei(await loan.getDebt())).to.be.closeTo(200, 0.1);
      expect(await loan.isSolvent()).to.be.true;
    });

  });

});

