import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";
import redstone from 'redstone-api';

import VariableUtilisationRatesCalculatorArtifact from '../../artifacts/contracts/VariableUtilisationRatesCalculator.sol/VariableUtilisationRatesCalculator.json';
import PoolArtifact from '../../artifacts/contracts/Pool.sol/Pool.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {
  fromWei,
  getFixedGasSigners,
  toBytes32,
  toWei,
  formatUnits,
  deployAndInitPangolinExchangeContract, getSelloutRepayAmount, Asset,
} from "../_helpers";
import {WrapperBuilder} from "redstone-flash-storage";
import {
  VariableUtilisationRatesCalculator,
  PangolinExchange,
  Pool,
  SmartLoan,
  SmartLoan__factory,
  MockSmartLoan,
  MockSmartLoan__factory,
  TransparentUpgradeableProxy__factory,
  MockUpgradedSmartLoan__factory,
  TransparentUpgradeableProxy,
} from "../../typechain";

import {OpenBorrowersRegistry__factory} from "../../typechain";
import {syncTime} from "../../src/utils/blockchain";
import {BigNumber, Contract} from "ethers";
import {parseUnits} from "ethers/lib/utils";

chai.use(solidity);

const {deployContract, provider} = waffle;
const ZERO = ethers.constants.AddressZero;
const pangolinRouterAddress = '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106';
const usdTokenAddress = '0xc7198437980c041c805a1edcba50c1ce5db95118';
const linkTokenAddress = '0x5947bb275c521040051d82396192181b413227a3';
const erc20ABI = [
  'function decimals() public view returns (uint8)',
  'function balanceOf(address _owner) public view returns (uint256 balance)',
  'function approve(address _spender, uint256 _value) public returns (bool success)',
  'function allowance(address owner, address spender) public view returns (uint256)'
]


describe('Smart loan', () => {

  describe('A loan without debt', () => {
    let exchange: PangolinExchange,
      loan: SmartLoan,
      wrappedLoan: any,
      pool: Pool,
      owner: SignerWithAddress,
      depositor: SignerWithAddress,
      usdTokenContract: Contract,
      usdTokenDecimalPlaces: BigNumber,
      MOCK_PRICES: any,
      AVAX_PRICE: number,
      USD_PRICE: number;

    before("deploy provider, exchange and pool", async () => {
      [owner, depositor] = await getFixedGasSigners(10000000);

      const variableUtilisationRatesCalculator = (await deployContract(owner, VariableUtilisationRatesCalculatorArtifact)) as VariableUtilisationRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      usdTokenContract = new ethers.Contract(usdTokenAddress, erc20ABI, provider);

      exchange = await deployAndInitPangolinExchangeContract(owner, pangolinRouterAddress, [new Asset(toBytes32('USD'), usdTokenAddress)]);

      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      usdTokenDecimalPlaces = await usdTokenContract.decimals();

      AVAX_PRICE = (await redstone.getPrice('AVAX')).value;
      USD_PRICE = (await redstone.getPrice('USDT')).value;

      MOCK_PRICES = [
        {
          symbol: 'USD',
          value: USD_PRICE
        },
        {
          symbol: 'AVAX',
          value: AVAX_PRICE
        }
      ]

      await pool.initialize(variableUtilisationRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});
    });

    it("should deploy a smart loan", async () => {
      loan = await (new SmartLoan__factory(owner).deploy());
      await loan.initialize(exchange.address, pool.address);

      wrappedLoan = WrapperBuilder
        .mockLite(loan)
        .using(
          () => {
            return {
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

    it("should buy an asset", async () => {
      const usdPrice = USD_PRICE;
      const investedAmount = 100;

      const slippageTolerance = 0.03;
      const requiredAvaxAmount = MOCK_PRICES[0].value * investedAmount * (1 + slippageTolerance) / AVAX_PRICE;

      await wrappedLoan.invest(
        toBytes32('USD'),
        parseUnits(investedAmount.toString(), usdTokenDecimalPlaces),
        toWei(requiredAvaxAmount.toString())
      );
      const expectedAssetValueInAVAX = usdPrice * investedAmount / AVAX_PRICE;

      expect(fromWei(await wrappedLoan.getAssetValue(toBytes32('USD')))).to.be.closeTo(expectedAssetValueInAVAX, 0.0001);
      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.closeTo(100, 0.1);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.equal(0);
      expect(await wrappedLoan.getLTV()).to.be.equal(0);
    });

    it("should provide assets balances and prices", async () => {
      const estimatedAVAXPriceFor1USDToken = await exchange.getEstimatedAVAXForERC20Token(toWei("1", usdTokenDecimalPlaces), usdTokenAddress);
      const usdTokenBalance = (await wrappedLoan.getAllAssetsBalances())[0];
      expect(formatUnits(usdTokenBalance, usdTokenDecimalPlaces)).to.be.equal(100);

      const usdTokenPrice = (await wrappedLoan.getAllAssetsPrices())[0];
      expect(fromWei(usdTokenPrice)).to.be.closeTo(fromWei(estimatedAVAXPriceFor1USDToken), 0.001);
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
          () => {
            return {
              prices: UPDATED_MOCK_PRICES,
              timestamp: Date.now()
            }
          })

      const expectedUSDTokenValue = initialUSDTokenAssetValue.mul(2);
      const usdTokenValueDifference = expectedUSDTokenValue.sub(initialUSDTokenAssetValue);

      expect(await updatedLoan.getAssetValue(toBytes32('USD'))).to.be.closeTo(expectedUSDTokenValue, 100000000000);
      expect(await updatedLoan.getTotalValue()).to.closeTo(initialLoanTotalValue.add(usdTokenValueDifference), 100000000000);
      expect(fromWei(await updatedLoan.getDebt())).to.be.equal(0);
      expect(await updatedLoan.getLTV()).to.be.equal(0);
    });


    it("should redeem investment", async () => {
      const initialUSDTokenBalanceInWei = (await wrappedLoan.getAllAssetsBalances())[0];
      const usdPrice = USD_PRICE;

      const avaxPrice = AVAX_PRICE;
      const slippageTolerance = 0.05;

      await wrappedLoan.redeem(
        toBytes32('USD'),
        initialUSDTokenBalanceInWei,
        toWei((formatUnits(initialUSDTokenBalanceInWei, usdTokenDecimalPlaces) * usdPrice / avaxPrice * (1 - slippageTolerance)).toString()));

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
    let exchange: PangolinExchange,
      loan: SmartLoan,
      wrappedLoan: any,
      pool: Pool,
      owner: SignerWithAddress,
      depositor: SignerWithAddress,
      usdTokenContract: Contract,
      usdTokenDecimalPlaces: BigNumber,
      MOCK_PRICES: any,
      AVAX_PRICE: number;

    before("deploy provider, exchange and pool", async () => {
      [owner, depositor] = await getFixedGasSigners(10000000);

      const variableUtilisationRatesCalculator = (await deployContract(owner, VariableUtilisationRatesCalculatorArtifact)) as VariableUtilisationRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      usdTokenContract = new ethers.Contract(usdTokenAddress, erc20ABI, provider);

      exchange = await deployAndInitPangolinExchangeContract(owner, pangolinRouterAddress, [new Asset(toBytes32('USD'), usdTokenAddress)]);

      usdTokenDecimalPlaces = await usdTokenContract.decimals();
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());
      await pool.initialize(variableUtilisationRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});

      AVAX_PRICE = (await redstone.getPrice('AVAX')).value;
      MOCK_PRICES = [
        {
          symbol: 'USD',
          value: AVAX_PRICE * fromWei(await exchange.getEstimatedAVAXForERC20Token(toWei("1", usdTokenDecimalPlaces), usdTokenAddress))
        },
        {
          symbol: 'AVAX',
          value: AVAX_PRICE
        }
      ]
    });

    it("should deploy a smart loan", async () => {
      loan = await (new SmartLoan__factory(owner).deploy());
      loan.initialize(exchange.address, pool.address);

      wrappedLoan = WrapperBuilder
        .mockLite(loan)
        .using(
          () => {
            return {
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
      await expect(wrappedLoan.borrow(toWei("500"))).to.be.revertedWith("LoanInsolvent()");
    });

  });

  describe('A loan with sellout and proxy upgradeability', () => {
    let exchange: PangolinExchange,
      loan: SmartLoan,
      wrappedLoan: any,
      pool: Pool,
      owner: SignerWithAddress,
      depositor: SignerWithAddress,
      admin: SignerWithAddress,
      proxy: TransparentUpgradeableProxy,
      usdTokenContract: Contract,
      linkTokenContract: Contract,
      usdTokenDecimalPlaces: BigNumber,
      linkTokenDecimalPlaces: BigNumber,
      MOCK_PRICES: any,
      AVAX_PRICE: number,
      LINK_PRICE: number,
      USD_PRICE: number;

    before("deploy provider, exchange and pool", async () => {
      [owner, depositor, admin] = await getFixedGasSigners(10000000);

      const variableUtilisationRatesCalculator = (await deployContract(owner, VariableUtilisationRatesCalculatorArtifact)) as VariableUtilisationRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      usdTokenContract = new ethers.Contract(usdTokenAddress, erc20ABI, provider);
      linkTokenContract = new ethers.Contract(linkTokenAddress, erc20ABI, provider);

      exchange = await deployAndInitPangolinExchangeContract(owner, pangolinRouterAddress, [
          new Asset(toBytes32('USD'), usdTokenAddress),
          new Asset(toBytes32('LINK'), linkTokenAddress)
        ]);

      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      usdTokenDecimalPlaces = await usdTokenContract.decimals();
      linkTokenDecimalPlaces = await linkTokenContract.decimals();

      AVAX_PRICE = (await redstone.getPrice('AVAX')).value;
      USD_PRICE = (await redstone.getPrice('USDT')).value;
      LINK_PRICE = (await redstone.getPrice('LINK')).value;

      MOCK_PRICES = [
        {
          symbol: 'USD',
          value: USD_PRICE
        },
        {
          symbol: 'LINK',
          value: LINK_PRICE
        },
        {
          symbol: 'AVAX',
          value: AVAX_PRICE
        }
      ]

      await pool.initialize(variableUtilisationRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});
    });

    it("should deploy a smart loan behind a proxy", async () => {
      loan = await (new SmartLoan__factory(owner).deploy());
      proxy = await (new TransparentUpgradeableProxy__factory(owner).deploy(loan.address, admin.address, []));
      loan = await (new SmartLoan__factory(owner).attach(proxy.address));

      loan.initialize(exchange.address, pool.address);

      wrappedLoan = WrapperBuilder
        .mockLite(loan)
        .using(
          () => {
            return {
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
      await wrappedLoan.borrow(toWei("300"));

      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.equal(400);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.equal(300);
      expect(await wrappedLoan.getLTV()).to.be.equal(3000);
    });

    it("should invest", async () => {
      const slippageTolerance = 0.03;
      let investedAmount = 15000;
      let requiredAvaxAmount = USD_PRICE * investedAmount * (1 + slippageTolerance) / AVAX_PRICE;
      await wrappedLoan.invest(
        toBytes32('USD'),
        parseUnits(investedAmount.toString(), usdTokenDecimalPlaces),
        toWei(requiredAvaxAmount.toString())
      );

      investedAmount = 300;
      requiredAvaxAmount = LINK_PRICE * investedAmount * (1 + slippageTolerance) / AVAX_PRICE;
      await wrappedLoan.invest(
        toBytes32('LINK'),
        parseUnits(investedAmount.toString(), linkTokenDecimalPlaces),
        toWei(requiredAvaxAmount.toString())
      );


      let balances = await wrappedLoan.getAllAssetsBalances();

      const currentUSDTokenBalance = balances[0];
      const currentLINKTokenBalance = balances[1];

      expect(currentUSDTokenBalance).to.be.equal(toWei("15000", usdTokenDecimalPlaces));
      expect(currentLINKTokenBalance).to.be.equal(toWei("300", linkTokenDecimalPlaces));
    });

    it('should return the balance of a token', async () => {
      const linkTokenBalance = await linkTokenContract.connect(owner).balanceOf(owner.address);
      const smartLoanLinkTokenBalance = await wrappedLoan.getBalance(owner.address, toBytes32('LINK'));

      expect(linkTokenBalance).to.be.equal(smartLoanLinkTokenBalance);
    })

    it("should fail a sellout attempt", async () => {
      expect(await wrappedLoan.getLTV()).to.be.lt(5000);
      expect(await wrappedLoan.isSolvent()).to.be.true;
      await expect(wrappedLoan.liquidateLoan(toWei("1", 18))).to.be.revertedWith("LoanSolvent()");
    });

    it("should sellout assets partially bringing the loan to a solvent state", async () => {
      let balances = await wrappedLoan.getAllAssetsBalances();
      const initialUSDTokenBalance = balances[0];
      const initialLINKTokenBalance = balances[1];
      const poolAvaxValue = await provider.getBalance(pool.address);

      expect(await wrappedLoan.isSolvent()).to.be.true;

      // Upgrade to a mock Smart Loan contract
      let mockUpgradedSmartLoan = await (new MockUpgradedSmartLoan__factory(owner).deploy());
      await proxy.connect(admin).upgradeTo(mockUpgradedSmartLoan.address);

      expect(await wrappedLoan.isSolvent()).to.be.false;

      const repayAmount = await getSelloutRepayAmount(
        await wrappedLoan.getTotalValue(),
        await wrappedLoan.getDebt(),
        await wrappedLoan.LIQUIDATION_BONUS(),
        await wrappedLoan.MAX_LTV()
      )

      await wrappedLoan.liquidateLoan(repayAmount.toLocaleString('fullwide', {useGrouping:false}));


      expect(await wrappedLoan.isSolvent()).to.be.true;
      expect((await provider.getBalance(pool.address)).gt(poolAvaxValue)).to.be.true;

      balances = await wrappedLoan.getAllAssetsBalances();

      const currentUSDTokenBalance = balances[0];
      const currentLINKTokenBalance = balances[1];

      expect(currentUSDTokenBalance).to.be.lt(initialUSDTokenBalance);
      if (currentUSDTokenBalance == 0) {
        expect(currentLINKTokenBalance).to.be.lt(initialLINKTokenBalance);
      } else {
        expect(currentLINKTokenBalance).to.be.eq(initialLINKTokenBalance);
      }

    });


  });

  describe('A loan with owner sellout', () => {
    let exchange: PangolinExchange,
      loan: SmartLoan,
      wrappedLoan: any,
      pool: Pool,
      owner: SignerWithAddress,
      depositor: SignerWithAddress,
      usdTokenContract: Contract,
      linkTokenContract: Contract,
      usdTokenDecimalPlaces: BigNumber,
      linkTokenDecimalPlaces: BigNumber,
      MOCK_PRICES: any,
      AVAX_PRICE: number,
      LINK_PRICE: number,
      USD_PRICE: number;

    before("deploy provider, exchange and pool", async () => {
      [owner, depositor] = await getFixedGasSigners(10000000);

      const variableUtilisationRatesCalculator = (await deployContract(owner, VariableUtilisationRatesCalculatorArtifact)) as VariableUtilisationRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      usdTokenContract = new ethers.Contract(usdTokenAddress, erc20ABI, provider);
      linkTokenContract = new ethers.Contract(linkTokenAddress, erc20ABI, provider);

      exchange = await deployAndInitPangolinExchangeContract(owner, pangolinRouterAddress,
[
        { asset: toBytes32('USD'), assetAddress: usdTokenAddress },
        { asset: toBytes32('LINK'), assetAddress: linkTokenAddress }
      ]);

      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      usdTokenDecimalPlaces = await usdTokenContract.decimals();
      linkTokenDecimalPlaces = await linkTokenContract.decimals();

      AVAX_PRICE = (await redstone.getPrice('AVAX')).value;
      USD_PRICE = (await redstone.getPrice('USDT')).value;
      LINK_PRICE = (await redstone.getPrice('LINK')).value;

      MOCK_PRICES = [
        {
          symbol: 'USD',
          value: USD_PRICE
        },
        {
          symbol: 'LINK',
          value: LINK_PRICE
        },
        {
          symbol: 'AVAX',
          value: AVAX_PRICE
        }
      ]

      await pool.initialize(variableUtilisationRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});
    });

    it("should deploy a smart loan, fund, borrow and invest", async () => {
      loan = await (new SmartLoan__factory(owner).deploy());
      loan.initialize(exchange.address, pool.address);

      wrappedLoan = WrapperBuilder
        .mockLite(loan)
        .using(
          () => {
            return {
              prices: MOCK_PRICES,
              timestamp: Date.now()
            }
          })

      await wrappedLoan.authorizeProvider();

      await wrappedLoan.fund({value: toWei("100")});
      await wrappedLoan.borrow(toWei("300"));

      expect(fromWei(await wrappedLoan.getTotalValue())).to.be.equal(400);
      expect(fromWei(await wrappedLoan.getDebt())).to.be.equal(300);
      expect(await wrappedLoan.getLTV()).to.be.equal(3000);

      const slippageTolerance = 0.03;
      let investedAmount = 40000;
      let requiredAvaxAmount = USD_PRICE * investedAmount * (1 + slippageTolerance) / AVAX_PRICE;

      await wrappedLoan.invest(
        toBytes32('USD'),
        parseUnits(investedAmount.toString(), usdTokenDecimalPlaces),
        toWei(requiredAvaxAmount.toString())
      );

      let balances = await wrappedLoan.getAllAssetsBalances();
      const currentUSDTokenBalance = balances[0];
      expect(currentUSDTokenBalance).to.be.equal(toWei("40000", usdTokenDecimalPlaces));
    });


    it("should fail a closeLoan attempt at the onlyOwner check", async () => {
      await expect(wrappedLoan.connect(depositor).closeLoan()).to.be.revertedWith("Ownable: caller is not the owner")
    });

    it("should perform an owner's closeLoan call", async () => {
      const ownerInitialAvaxBalance = await provider.getBalance(owner.address);
      await wrappedLoan.closeLoan();
      expect(await wrappedLoan.isSolvent()).to.be.true;
      expect(await wrappedLoan.getDebt()).to.be.equal(0);
      expect(await provider.getBalance(owner.address)).to.be.gt(ownerInitialAvaxBalance);

      let balances = await wrappedLoan.getAllAssetsBalances();
      expect(balances[0]).to.be.equal(0);
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

