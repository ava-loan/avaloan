import {ethers, waffle} from 'hardhat';
import chai from 'chai';
import {BigNumber, Contract} from 'ethers';
import {solidity} from "ethereum-waffle";

import PangolinExchangeArtifact from '../artifacts/contracts/PangolinExchange.sol/PangolinExchange.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {PangolinExchange} from '../typechain';
import {getFixedGasSigners} from "./_helpers";

chai.use(solidity);

const {deployContract, provider} = waffle;
const {expect} = chai;

const pangolinRouterAddress = '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106';
const daiETokenAddress = '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70';
const WAVAXTokenAddress = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7';

const ERC20Abi = [
  'function decimals() public view returns (uint8)',
  'function balanceOf(address _owner) public view returns (uint256 balance)',
  'function approve(address _spender, uint256 _value) public returns (bool success)'
]

const pangolinRouterAbi = [
  'function getAmountsIn (uint256 amountOut, address[] path) view returns (uint256[])'
]


describe('PangolinExchange', () => {
  describe('Test buying and selling an asset', () => {
    let sut: PangolinExchange,
      daie: Contract,
      pgrt: Contract,
      owner: SignerWithAddress;

    before('Deploy the PangolinExchange contract', async () => {
      [owner] = await getFixedGasSigners(10000000);
      sut = await deployContract(owner, PangolinExchangeArtifact, [pangolinRouterAddress]) as PangolinExchange;
      daie = await new ethers.Contract(daiETokenAddress, ERC20Abi);
      pgrt = await new ethers.Contract(pangolinRouterAddress, pangolinRouterAbi);
    });


    it('should check for the amount of tokens to buy to be greater than 0', async () => {
      await expect(sut.buyERC20Token(daiETokenAddress, 0)).to.be.revertedWith('Amount of tokens to buy has to be greater than 0');
    });


    it('should check if enough funds were provided', async () => {
      const daiePurchaseAmount = 1e18;
      const estimatedAvax = (await pgrt.connect(owner).getAmountsIn(daiePurchaseAmount.toString(), [WAVAXTokenAddress, daiETokenAddress]))[0];

      await expect(sut.buyERC20Token(daiETokenAddress, daiePurchaseAmount.toString(), {value: Math.floor(estimatedAvax*0.9).toString()})).to.be.revertedWith('Not enough funds provided');
    });


    it('should check if an erc20 tokens were purchased successfully', async () => {
      const DAIePurchaseAmount = 1e18;
      const estimatedAvax = (await pgrt.connect(owner).getAmountsIn(DAIePurchaseAmount.toString(), [WAVAXTokenAddress, daiETokenAddress]))[0];
      const initialDAIeBalance = await daie.connect(owner).balanceOf(owner.address);
      const initialAvaxBalance = await provider.getBalance(owner.address);

      expect(initialDAIeBalance).to.equal(0);

      await sut.buyERC20Token(daiETokenAddress, DAIePurchaseAmount.toString(), {value: estimatedAvax.toString()});

      const currentDAIeBalance = await daie.connect(owner).balanceOf(owner.address);
      const currentAvaxBalance = await provider.getBalance(owner.address);
      const avaxBalanceDifference = BigNumber.from(initialAvaxBalance.toString()).sub(BigNumber.from(estimatedAvax.toString()));

      expect(currentDAIeBalance).to.equal(DAIePurchaseAmount.toString());
      expect(currentAvaxBalance).to.be.lt(avaxBalanceDifference);
    });


    it('should check for the amount of tokens to sell to be greater than 0', async () => {
      await expect(sut.sellERC20Token(daiETokenAddress, 0)).to.be.revertedWith('Amount of tokens to sell has to be greater than 0');
    });


    it('should check for a sufficient token allowance', async () => {
      await expect(sut.sellERC20Token(daiETokenAddress, 1)).to.be.revertedWith('Insufficient token allowance');
    });


    it('should check if an erc20 tokens were sold successfully', async () => {
      const initialDAIeBalance = await daie.connect(owner).balanceOf(owner.address);
      const initialAvaxBalance = await provider.getBalance(owner.address);
      const daieSaleAmount = 1e18/2;

      await daie.connect(owner).approve(sut.address, daieSaleAmount.toString());
      await sut.sellERC20Token(daiETokenAddress, daieSaleAmount.toString());

      const currentDAIeBalance = await daie.connect(owner).balanceOf(owner.address);
      const currentAvaxBalance = await provider.getBalance(owner.address);
      const daieBalanceDifference = BigNumber.from(initialDAIeBalance.toString()).sub(BigNumber.from(currentDAIeBalance.toString()));

      expect(currentDAIeBalance).to.be.equal(daieBalanceDifference);
      expect(currentAvaxBalance).to.be.gt(initialAvaxBalance);
    });
  });
});
