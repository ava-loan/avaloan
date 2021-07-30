import {ethers, waffle} from 'hardhat'
import chai from 'chai'
import {solidity} from "ethereum-waffle";

import SimpleAssetsExchangeArtifact from '../artifacts/contracts/SimpleAssetsExchange.sol/SimpleAssetsExchange.json';
import SimplePriceProviderArtifact from '../artifacts/contracts/SimplePriceProvider.sol/SimplePriceProvider.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, getFixedGasSigners, toBytes32, toWei} from "./_helpers";
import {SimpleAssetsExchange, SimplePriceProvider} from "../typechain";

chai.use(solidity);

const {deployContract, provider} = waffle;
const {expect} = chai;

// TODO: refactor and remove dependencies between tests.
describe('SimpleAssetsExchange', () => {

  describe('Buy and sell asset', () => {
    let sut: SimpleAssetsExchange,
      priceProvider: SimplePriceProvider,
      owner: SignerWithAddress,
      oracle: SignerWithAddress;

    before("deploy the Exchange", async () => {
      [owner, oracle] = await getFixedGasSigners(10000000);
      sut = await deployContract(owner, SimpleAssetsExchangeArtifact) as SimpleAssetsExchange;
    });

    it("should set the price provider", async () => {
      priceProvider = await deployContract(owner, SimplePriceProviderArtifact) as SimplePriceProvider;
      await priceProvider.setOracle(oracle.address);
      await sut.setPriceProvider(priceProvider.address);
    });


    it("should check if there is enough funds for purchase", async () => {
      await priceProvider.connect(oracle).setPrice(toBytes32('USD'), toWei("0.5"));
      await expect(sut.buyAsset(toBytes32('USD'), toWei("100"), {value: toWei("49")}))
        .to.be.revertedWith("Not enough funds provided");
    });

    it("should buy asset", async () => {
      await priceProvider.connect(oracle).setPrice(toBytes32('USD'), toWei("0.5"));
      await sut.buyAsset(toBytes32('USD'), toWei("100"), {value: toWei("50")});

      const balance = fromWei(await sut.getBalance(owner.address, toBytes32('USD')));
      expect(balance).to.be.equal(100);

      expect(fromWei(await provider.getBalance(sut.address))).to.be.equal(50);
    });

    it("should not allow selling more than owned", async () => {
      await expect(sut.sellAsset(toBytes32('USD'), toWei("101")))
        .to.be.revertedWith("Not enough assets to sell");
    });

    it("should sell part of asset", async () => {
      await sut.sellAsset(toBytes32('USD'), toWei("50"));

      let balance = fromWei(await sut.getBalance(owner.address, toBytes32('USD')));
      expect(balance).to.be.equal(50);

      expect(fromWei(await provider.getBalance(sut.address))).to.be.equal(25);
    });

    it("should sell rest of asset", async () => {
      await sut.sellAsset(toBytes32('USD'), toWei("50"));

      let balance = fromWei(await sut.getBalance(owner.address, toBytes32('USD')));
      expect(balance).to.be.equal(0);

      expect(fromWei(await provider.getBalance(sut.address))).to.be.equal(0);
    });

  });

});

