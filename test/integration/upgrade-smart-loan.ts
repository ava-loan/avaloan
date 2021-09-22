import {ethers, waffle} from 'hardhat'
import chai, {expect} from 'chai'
import {solidity} from "ethereum-waffle";

import FixedRatesCalculatorArtifact from '../../artifacts/contracts/FixedRatesCalculator.sol/FixedRatesCalculator.json';
import PoolArtifact from '../../artifacts/contracts/Pool.sol/Pool.json';
import SimplePriceProviderArtifact from '../../artifacts/contracts/SimplePriceProvider.sol/SimplePriceProvider.json';
import SmartLoanArtifact from '../../artifacts/contracts/SmartLoan.sol/SmartLoan.json';
import PangolinExchangeArtifact from '../../artifacts/contracts/PangolinExchange.sol/PangolinExchange.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, time, toBytes32, toWei} from "../_helpers";
import {
  FixedRatesCalculator,
  Pool,
  PangolinExchange,
  SimplePriceProvider,
  SmartLoan,
  UpgradeableBeacon,
  BeaconProxy,
  SmartLoan__factory
} from "../../typechain";

import {CompoundingIndex__factory, OpenBorrowersRegistry__factory} from "../../typechain";
import {UpgradeableBeacon__factory, BeaconProxy__factory, MockUpgradedSmartLoan__factory} from "../../typechain";
import {getFixedGasSigners} from "../_helpers";
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

describe('Smart loan - upgrading', () => {

  describe('Check basic logic before and after upgrade', () => {
    let priceProvider: SimplePriceProvider,
      exchange: PangolinExchange,
      loan: SmartLoan,
      pool: Pool,
      owner: SignerWithAddress,
      oracle: SignerWithAddress,
      depositor: SignerWithAddress,
      other: SignerWithAddress,
      usdTokenContract: Contract,
      usdTokenDecimalPlaces: BigNumber,
      beacon: UpgradeableBeacon;

    before("should deploy provider, exchange and pool", async () => {
      [owner, oracle, depositor, other] = await getFixedGasSigners(10000000);

      const fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
      pool = (await deployContract(owner, PoolArtifact)) as Pool;
      priceProvider = (await deployContract(owner, SimplePriceProviderArtifact)) as SimplePriceProvider;
      usdTokenContract = new ethers.Contract(usdTokenAddress, erc20ABI, provider);
      exchange = await deployContract(owner, PangolinExchangeArtifact, [pangolinRouterAddress]) as PangolinExchange;
      const borrowersRegistry = await (new OpenBorrowersRegistry__factory(owner).deploy());

      await priceProvider.setOracle(oracle.address);
      usdTokenDecimalPlaces = await usdTokenContract.decimals();
      await exchange.updateAssetAddress(toBytes32('USD'), usdTokenAddress);
      await exchange.updateAssetAddress(toBytes32('ETH'), '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab');
      await exchange.updateAssetAddress(toBytes32('BTC'), '0x50b7545627a5162f82a992c33b87adc75187b218');
      await exchange.updateAssetAddress(toBytes32('LINK'), '0x5947bb275c521040051d82396192181b413227a3');

      await pool.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
      await pool.connect(depositor).deposit({value: toWei("1000")});
    });

    it("should deploy a loan", async () => {
      loan = (await deployContract(owner, SmartLoanArtifact)) as SmartLoan;
      beacon = await (new UpgradeableBeacon__factory(owner).deploy(loan.address));
      let proxy = await (new BeaconProxy__factory(owner).deploy(beacon.address, []));
      loan = await (new SmartLoan__factory(owner).attach(proxy.address));
      await loan.initialize(priceProvider.address, exchange.address, pool.address);
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


    it("should buy an asset", async () => {
      const estimatedAVAXPriceFor1USDToken = await exchange.getEstimatedAVAXForERC20Token(toWei("1", usdTokenDecimalPlaces), usdTokenAddress);
      await priceProvider.connect(oracle).setPrice(toBytes32('USD'), estimatedAVAXPriceFor1USDToken);

      await loan.invest(toBytes32('USD'), toWei("100", usdTokenDecimalPlaces));

      const expectedAssetValue = estimatedAVAXPriceFor1USDToken.mul("100")

      expect(await loan.getAssetValue(toBytes32('USD'))).to.be.equal(expectedAssetValue);

      expect(fromWei(await loan.getTotalValue())).to.be.closeTo(100, 0.00001);
      expect(fromWei(await loan.getDebt())).to.be.equal(0);
      expect(await loan.getSolvencyRatio()).to.be.equal(10000);
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
