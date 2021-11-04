import {ethers, waffle} from 'hardhat';
import chai from 'chai';
import {BigNumber, Contract} from 'ethers';
import {solidity} from "ethereum-waffle";

import PangolinExchangeArtifact from '../../artifacts/contracts/PangolinExchange.sol/PangolinExchange.json';
import SupportedAssetsArtifact from '../../artifacts/contracts/SupportedAssets.sol/SupportedAssets.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {PangolinExchange, SupportedAssets} from '../../typechain';
import {getFixedGasSigners, toBytes32, toWei} from "../_helpers";

chai.use(solidity);

const {deployContract, provider} = waffle;
const {expect} = chai;

const pangolinRouterAddress = '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106';
const daiTokenAddress = '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70';
const WAVAXTokenAddress = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7';

const ERC20Abi = [
  'function decimals() public view returns (uint8)',
  'function balanceOf(address _owner) public view returns (uint256 balance)',
  'function approve(address _spender, uint256 _value) public returns (bool success)',
  'function transfer(address _to, uint256 _value) public returns (bool success)'
]

const pangolinRouterAbi = [
  'function getAmountsIn (uint256 amountOut, address[] path) view returns (uint256[])'
]


describe('PangolinExchange', () => {
  describe('Test buying and selling an asset', () => {
    let sut: PangolinExchange,
      daiToken: Contract,
      pangolinRouter: Contract,
      supportedAssets: SupportedAssets,
      owner: SignerWithAddress;

    before('Deploy the PangolinExchange contract', async () => {
      [owner] = await getFixedGasSigners(10000000);

      supportedAssets = (await deployContract(owner, SupportedAssetsArtifact)) as SupportedAssets;

      await supportedAssets.setAsset(toBytes32('DAI'), daiTokenAddress);

      sut = await deployContract(owner, PangolinExchangeArtifact, [pangolinRouterAddress, supportedAssets.address]) as PangolinExchange;
      daiToken = await new ethers.Contract(daiTokenAddress, ERC20Abi);
      pangolinRouter = await new ethers.Contract(pangolinRouterAddress, pangolinRouterAbi);
    });


    it('should check for the amount of tokens to buy to be greater than 0', async () => {
      await expect(sut.buyAsset(toBytes32('DAI'), 0)).to.be.revertedWith('Amount of tokens to buy has to be greater than 0');
    });


    it('should check if enough funds were provided', async () => {
      const daiTokenPurchaseAmount = 1e20;
      const estimatedAvax = (await pangolinRouter.connect(owner).getAmountsIn(daiTokenPurchaseAmount.toString(), [WAVAXTokenAddress, daiTokenAddress]))[0];

      await expect(sut.buyAsset(toBytes32('DAI'), daiTokenPurchaseAmount.toString(), {value: Math.floor(estimatedAvax*0.9).toString()})).to.be.revertedWith('Not enough funds provided');
    });


    it('should check if an erc20 tokens were purchased successfully', async () => {
      const daiTokenPurchaseAmount = 1e20;
      const estimatedAvax = (await pangolinRouter.connect(owner).getAmountsIn(daiTokenPurchaseAmount.toString(), [WAVAXTokenAddress, daiTokenAddress]))[0];
      const initialAvaxBalance = await provider.getBalance(owner.address);

      await sut.buyAsset(toBytes32('DAI'), daiTokenPurchaseAmount.toString(), {value: estimatedAvax.toString()})

      const currentDaiTokenBalance = await daiToken.connect(owner).balanceOf(owner.address);
      const currentAvaxBalance = await provider.getBalance(owner.address);
      const expectedAvaxBalance = BigNumber.from(initialAvaxBalance.toString()).sub(BigNumber.from(estimatedAvax.toString()));

      expect(currentDaiTokenBalance).to.equal(daiTokenPurchaseAmount.toString());
      expect(currentAvaxBalance).to.be.lte(expectedAvaxBalance);
    });


    it('should check for the amount of tokens to sell to be greater than 0', async () => {
      await expect(sut.sellAsset(toBytes32('DAI'), toWei("0"), toWei("0.01"))).to.be.revertedWith('Amount of tokens to sell has to be greater than 0');
    });


    it('should revert transaction in case of a sufficient token balance transferred to an exchange', async () => {
      await expect(sut.sellAsset(toBytes32('DAI'), toWei("1"), toWei("0.01"))).to.be.revertedWith('TransferHelper: TRANSFER_FROM_FAILED');
    });


    it('should check if an erc20 tokens were sold successfully', async () => {
      const initialDAITokenBalance = await daiToken.connect(owner).balanceOf(owner.address);
      const initialAvaxBalance = await provider.getBalance(owner.address);
      const daiTokenAmount = 1e20;

      await daiToken.connect(owner).transfer(sut.address, daiTokenAmount.toString());
      await sut.sellAsset(toBytes32('DAI'), daiTokenAmount.toString(), 1);

      const currentDAITokenBalance = await daiToken.connect(owner).balanceOf(owner.address);
      const currentAvaxBalance = await provider.getBalance(owner.address);
      const daiTokenExpectedBalance = BigNumber.from(initialDAITokenBalance.toString()).sub(BigNumber.from(daiTokenAmount.toString()));

      expect(currentDAITokenBalance).to.be.equal(daiTokenExpectedBalance);
      expect(currentAvaxBalance).to.be.gt(initialAvaxBalance);
    });

    it('should return the balance of a token', async () => {
      const daiTokenBalance = await daiToken.connect(owner).balanceOf(owner.address);
      const exchangeDAITokenBalance = await sut.getBalance(owner.address, toBytes32('DAI'));

      expect(daiTokenBalance).to.be.equal(exchangeDAITokenBalance);
    })
  });
});
