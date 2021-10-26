import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import FixedRatesCalculatorArtifact from '../../artifacts/contracts/FixedRatesCalculator.sol/FixedRatesCalculator.json';
import PoolArtifact from '../../artifacts/contracts/Pool.sol/Pool.json';
import SupportedAssetsArtifact from '../../artifacts/contracts/SupportedAssets.sol/SupportedAssets.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {
  fromWei,
  getFixedGasSigners,
  toBytes32,
  toWei,
  formatUnits,
  deployAndInitPangolinExchangeContract,
} from "../_helpers";
import { WrapperBuilder } from "redstone-flash-storage";
import {
  FixedRatesCalculator,
  PangolinExchange,
  Pool,
  SupportedAssets,
  SmartLoan,
  SmartLoan__factory, MockSmartLoan, MockSmartLoan__factory
} from "../../typechain";

import {OpenBorrowersRegistry__factory} from "../../typechain";
import { syncTime } from "../../src/utils/blockchain";
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
    let supportedAssets: SupportedAssets,
      exchange: PangolinExchange,
      loan: SmartLoan,
      wrappedLoan: any,
      pool: Pool,
      owner: SignerWithAddress,
      depositor: SignerWithAddress,
      usdTokenContract: Contract,
      usdTokenDecimalPlaces: BigNumber,
      MOCK_PRICES: any,
      MOCK_AVAX_PRICE: number;

    before("deploy provider, exchange and pool", async () => {
      [owner, depositor] = await getFixedGasSigners(10000000);

      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      usdTokenContract = new ethers.Contract(usdTokenAddress, erc20ABI, provider);

      supportedAssets = (await deployContract(owner, SupportedAssetsArtifact)) as SupportedAssets;
      await supportedAssets.setAsset(toBytes32('USD'), usdTokenAddress);


      exchange = await deployAndInitPangolinExchangeContract(owner, pangolinRouterAddress, supportedAssets.address);
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      usdTokenDecimalPlaces = await usdTokenContract.decimals();

      MOCK_AVAX_PRICE = 100000;
      MOCK_PRICES = [
        {
          symbol: 'USD',
          value: MOCK_AVAX_PRICE * fromWei(await exchange.getEstimatedAVAXForERC20Token(toWei("1", usdTokenDecimalPlaces), usdTokenAddress))
        },
        {
          symbol: 'AVAX',
          value: MOCK_AVAX_PRICE
        }
      ]

      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});
    });

    it("should deploy a smart loan", async () => {
      loan = await (new SmartLoan__factory(owner).deploy());
      await loan.initialize(supportedAssets.address, exchange.address, pool.address);

      wrappedLoan = WrapperBuilder
        .mockLite(loan)
        .using(
          () => { return {
            prices: MOCK_PRICES,
            timestamp: Date.now()
          }
        })

      await wrappedLoan.authorizeProvider();
    });

    it("should fund a loan", async () => {
      await wrappedLoan.getTotalValue();
      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.equal(0);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.equal(0);
      expect(await wrappedLoan.getLTV()).to.be.equal(0);

      await wrappedLoan.fund({value: toWei("200")});

      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.equal(200);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.equal(0);
      expect(await wrappedLoan.getLTV()).to.be.equal(0);
    });

    it("should withdraw part of funds", async () => {
      await wrappedLoan.withdraw(toWei("100"));

      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.equal(100);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.equal(0);
      expect(await wrappedLoan.getLTV()).to.be.equal(0);
    });

    it("should buy asset", async () => {
      const usdPrice = MOCK_PRICES.find((token: any) => token.symbol == 'USD').value;
      const investedAmount = 100;

      const slippageTolerance = 0.03;
      const requiredAvaxAmount = MOCK_PRICES[0].value * investedAmount * (1 + slippageTolerance) / MOCK_AVAX_PRICE;
      await wrappedLoan.invest(
        toBytes32('USD'),
        toWei(investedAmount.toString(), usdTokenDecimalPlaces),
        toWei(requiredAvaxAmount.toString())
      );

      const expectedAssetValue = fromWei(toWei(usdPrice.toString()).div(MOCK_AVAX_PRICE).mul(BigNumber.from(investedAmount)));

      expect(fromWei(await wrappedLoan.getAssetValue(toBytes32('USD')))).to.be.closeTo(expectedAssetValue, 0.0001);
      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.closeTo(100, 0.0001);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.equal(0);
      expect(await wrappedLoan.getLTV()).to.be.equal(0);
    });

    it("should provide assets balances and prices", async () => {
      const estimatedAVAXPriceFor1USDToken = await exchange.getEstimatedAVAXForERC20Token(toWei("1", usdTokenDecimalPlaces), usdTokenAddress);
      const usdTokenBalance = (await wrappedLoan.getAllAssetsBalances())[0];
      expect(formatUnits(usdTokenBalance, usdTokenDecimalPlaces)).to.be.equal(100);

      const usdTokenPrice = (await wrappedLoan.getAllAssetsPrices())[0];
      expect(fromWei(usdTokenPrice)).to.be.closeTo(fromWei(estimatedAVAXPriceFor1USDToken), 0.000001);
    });


    it("should update valuation after price change", async () => {
      const initialUSDTokenAssetValue = await wrappedLoan.getAssetValue(toBytes32('USD'));
      const initialLoanTotalValue = await wrappedLoan.getTotalValue();

      let UPDATED_MOCK_PRICES = MOCK_PRICES.map(
        (token: any) => {
          if (token.symbol == 'USD') {
            token.value = 2 * token.value;
          }
          return token;
        }
      );

      await syncTime(); // recommended for hardhat test

      let updatedLoan = WrapperBuilder
        .mockLite(loan)
        .using(
          () => { return {
            prices: UPDATED_MOCK_PRICES,
            timestamp: Date.now()
          }
        })

      const expectedUSDTokenValue = initialUSDTokenAssetValue.mul(2);
      const usdTokenValueDifference = expectedUSDTokenValue.sub(initialUSDTokenAssetValue);

      expect(await updatedLoan.getAssetValue(toBytes32('USD'))).to.be.closeTo(expectedUSDTokenValue, 10000000);
      expect(await updatedLoan.getTotalValue()).to.closeTo(initialLoanTotalValue.add(usdTokenValueDifference), 10000000000);
      expect(fromWei(await updatedLoan.getDebt())).to.be.equal(0);
      expect(await updatedLoan.getLTV()).to.be.equal(0);
    });


    it("should redeem investment", async () => {
      const initialUSDTokenBalance = (await wrappedLoan.getAllAssetsBalances())[0];

      await wrappedLoan.redeem(toBytes32('USD'), initialUSDTokenBalance);

      const currentUSDTokenBalance = (await wrappedLoan.getAllAssetsBalances())[0];

      expect(currentUSDTokenBalance).to.be.equal(0);
      expect(fromWei(await wrappedLoan.getAssetValue(toBytes32('USD')))).to.be.equal(0);

      const currentLoanTotalValue = await wrappedLoan.getTotalValue();

      // TODO: Refactor this using the .to.be.closeTo (delta 0.001) after resolving argument types issues
      const lowerExpectedBound = currentLoanTotalValue.mul(999).div(1000);
      const upperExpectedBound = currentLoanTotalValue.mul(1001).div(1000);
      expect(currentLoanTotalValue).to.be.gte(lowerExpectedBound);
      expect(currentLoanTotalValue).to.be.lte(upperExpectedBound);

      expect(fromWei(await wrappedLoan.getDebt())).to.be.equal(0);
      expect(await wrappedLoan.getLTV()).to.be.equal(0);
    });

  });

  describe('A loan with debt and repayment', () => {
    let supportedAssets: SupportedAssets,
      exchange: PangolinExchange,
      loan: SmartLoan,
      wrappedLoan: any,
      pool: Pool,
      owner: SignerWithAddress,
      depositor: SignerWithAddress,
      usdTokenContract: Contract,
      usdTokenDecimalPlaces: BigNumber,
      MOCK_PRICES: any,
      MOCK_AVAX_PRICE: number;

    before("deploy provider, exchange and pool", async () => {
      [owner, depositor] = await getFixedGasSigners(10000000);

      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      usdTokenContract = new ethers.Contract(usdTokenAddress, erc20ABI, provider);

      supportedAssets = (await deployContract(owner, SupportedAssetsArtifact)) as SupportedAssets;
      await supportedAssets.setAsset(toBytes32('USD'), usdTokenAddress);

      exchange = await deployAndInitPangolinExchangeContract(owner, pangolinRouterAddress, supportedAssets.address);

      usdTokenDecimalPlaces = await usdTokenContract.decimals();
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());
      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});

      MOCK_AVAX_PRICE = 100000;
      MOCK_PRICES = [
        {
          symbol: 'USD',
          value: MOCK_AVAX_PRICE * fromWei(await exchange.getEstimatedAVAXForERC20Token(toWei("1", usdTokenDecimalPlaces), usdTokenAddress))
        },
        {
          symbol: 'AVAX',
          value: MOCK_AVAX_PRICE
        }
      ]
    });

    it("should deploy a smart loan", async () => {
      loan = await (new SmartLoan__factory(owner).deploy());
      loan.initialize(supportedAssets.address, exchange.address, pool.address);

      wrappedLoan = WrapperBuilder
        .mockLite(loan)
        .using(
          () => { return {
            prices: MOCK_PRICES,
            timestamp: Date.now()
          }
          })

      await wrappedLoan.authorizeProvider();
    });


    it("should fund a loan", async () => {
      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.equal(0);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.equal(0);
      expect(await wrappedLoan.getLTV()).to.be.equal(0);

      await wrappedLoan.fund({value: toWei("100")});

      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.equal(100);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.equal(0);
      expect(await wrappedLoan.getLTV()).to.be.equal(0);
    });


    it("should borrow funds", async () => {
      await wrappedLoan.borrow(toWei("200"));

      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.equal(300);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.equal(200);
      expect(await wrappedLoan.getLTV()).to.be.equal(2000);
    });


    it("should repay funds", async () => {
      await wrappedLoan.repay(toWei("100"));

      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.equal(200);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.closeTo(100, 0.1);
      expect(await wrappedLoan.getLTV()).to.be.equal(1000);
    });


    it("should prevent borrowing too much", async () => {
      await expect(wrappedLoan.borrow(toWei("500"))).to.be.revertedWith("The action may cause an account to become insolvent");
    });

  });

  describe('A loan with liquidation', () => {
    let supportedAssets: SupportedAssets,
      exchange: PangolinExchange,
      loan: SmartLoan,
      wrappedLoan: any,
      pool: Pool,
      owner: SignerWithAddress,
      depositor: SignerWithAddress,
      usdTokenContract: Contract,
      usdTokenDecimalPlaces: BigNumber,
      MOCK_PRICES: any,
      MOCK_AVAX_PRICE: number;

    before("deploy provider, exchange and pool", async () => {
      [owner, depositor] = await getFixedGasSigners(10000000);

      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      usdTokenContract = new ethers.Contract(usdTokenAddress, erc20ABI, provider);

      supportedAssets = (await deployContract(owner, SupportedAssetsArtifact)) as SupportedAssets;
      await supportedAssets.setAsset(toBytes32('USD'), usdTokenAddress);

      exchange = await deployAndInitPangolinExchangeContract(owner, pangolinRouterAddress, supportedAssets.address);

      usdTokenDecimalPlaces = await usdTokenContract.decimals();
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());
      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});

      MOCK_AVAX_PRICE = 100000;
      MOCK_PRICES = [
        {
          symbol: 'USD',
          value: MOCK_AVAX_PRICE * fromWei(await exchange.getEstimatedAVAXForERC20Token(toWei("1", usdTokenDecimalPlaces), usdTokenAddress))
        },
        {
          symbol: 'AVAX',
          value: MOCK_AVAX_PRICE
        }
      ]
    });

    it("should deploy a smart loan", async () => {
      loan = await (new SmartLoan__factory(owner).deploy());
      loan.initialize(supportedAssets.address, exchange.address, pool.address);

      wrappedLoan = WrapperBuilder
        .mockLite(loan)
        .using(
          () => { return {
            prices: MOCK_PRICES,
            timestamp: Date.now()
          }
        })

      await wrappedLoan.authorizeProvider();
    });

    it("should fund a loan", async () => {
      await wrappedLoan.fund({value: toWei("100")});
    });

    it("should borrow funds", async () => {
      await wrappedLoan.borrow(toWei("400"));

      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.equal(500);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.closeTo(400, 0.1);
      expect(await wrappedLoan.getLTV()).to.be.equal(4000);
    });

    it("should invest", async () => {
      const investedAmount = 1800;

      const slippageTolerance = 0.03;
      const requiredAvaxAmount = MOCK_PRICES[0].value * investedAmount * (1 + slippageTolerance) / MOCK_AVAX_PRICE;
      await wrappedLoan.invest(
        toBytes32('USD'),
        toWei(investedAmount.toString(), usdTokenDecimalPlaces),
        toWei(requiredAvaxAmount.toString()));

      const currentUSDTokenBalance = (await loan.getAllAssetsBalances())[0];
      expect(currentUSDTokenBalance).to.be.equal(toWei("1800", usdTokenDecimalPlaces));
    });


    it("should liquidate", async () => {
      let UPDATED_MOCK_PRICES = MOCK_PRICES.map(
        (token: any) => {
          if (token.symbol == 'USD') {
            token.value = 0.1 * token.value;
          }
          return token;
        }
      );

      let loanUpdated = WrapperBuilder
        .mockLite(loan)
        .using(
          () => { return {
          prices: UPDATED_MOCK_PRICES,
          timestamp: Date.now()
        }
      })

      expect(await loanUpdated.isSolvent()).to.be.false;

      const initialLoanAVAXValue = await provider.getBalance(loanUpdated.address);
      const initialUSDTokenAssetValue = await loanUpdated.getAssetValue(toBytes32('USD'));

      expect(await loanUpdated.getTotalValue()).to.be.equal(initialLoanAVAXValue.add(initialUSDTokenAssetValue));

      await loanUpdated.liquidate(toWei("200"));

      const currentUSDTokenAssetValue = await loanUpdated.getAssetValue(toBytes32('USD'));
      const currentLoanAVAXValue = await provider.getBalance(loanUpdated.address);

      //Liquidator bonus was 10% of 200 = 20
      expect(currentLoanAVAXValue).to.be.equal(initialLoanAVAXValue.sub(toWei("220")));
      expect(await loanUpdated.getTotalValue()).to.be.equal(currentLoanAVAXValue.add(currentUSDTokenAssetValue));
      expect(fromWei(await loanUpdated.getDebt())).to.be.closeTo(200, 0.1);
      expect(await loanUpdated.isSolvent()).to.be.true;
    });

  });

  describe('A loan with edge LTV cases', () => {
    let loan: MockSmartLoan,
      owner: SignerWithAddress;

    before("deploy provider, exchange and pool", async () => {
      [owner] = await getFixedGasSigners(10000000);
    });

    it("should deploy a smart loan", async () => {
      loan = await (new MockSmartLoan__factory(owner).deploy());
    });

    it("should check debt equal to 0", async () => {
      await loan.setValue(40000);
      await loan.setDebt(0);
      expect(await loan.getLTV()).to.be.equal(0);
      expect(await loan.isSolvent()).to.be.true;
    });

    it("should check debt greater than 0 and lesser than totalValue", async () => {
      await loan.setValue(50000);
      await loan.setDebt(10000);
      expect(await loan.getLTV()).to.be.equal(250);
      expect(await loan.isSolvent()).to.be.true;
    });

    it("should check debt equal to totalValue", async () => {
      await loan.setValue(40000);
      await loan.setDebt(40000);
      expect(await loan.getLTV()).to.be.equal(5000);
      expect(await loan.isSolvent()).to.be.false;
    });

    it("should check debt greater than totalValue", async () => {
      await loan.setValue(40000);
      await loan.setDebt(40001);
      expect(await loan.getLTV()).to.be.equal(5000);
      expect(await loan.isSolvent()).to.be.false;
    });

    it("should check LTV 4999", async () => {
      await loan.setValue(48001);
      await loan.setDebt(40000);
      expect(await loan.getLTV()).to.be.equal(4999);
      expect(await loan.isSolvent()).to.be.true;
    });

    it("should check LTV 5000", async () => {
      await loan.setValue(48000);
      await loan.setDebt(40000);
      expect(await loan.getLTV()).to.be.equal(5000);
      expect(await loan.isSolvent()).to.be.false;
    });

    it("should check LTV 5001", async () => {
      await loan.setValue(47998);
      await loan.setDebt(40000);
      expect(await loan.getLTV()).to.be.equal(5001);
      expect(await loan.isSolvent()).to.be.false;
    });


  });

});

