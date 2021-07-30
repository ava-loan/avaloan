import {ethers, waffle} from 'hardhat'
import chai from 'chai'
import {solidity} from "ethereum-waffle";

import SimplePriceProviderArtifact from '../artifacts/contracts/SimplePriceProvider.sol/SimplePriceProvider.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, getFixedGasSigners, toBytes32, toWei} from "./_helpers";
import {SimplePriceProvider} from "../typechain";

chai.use(solidity);

const {deployContract} = waffle;
const {expect} = chai;

// TODO: refactor and remove dependencies between tests.
describe('SimplePriceProvider', () => {

  describe('Set and read price', () => {
    let sut: SimplePriceProvider,
      owner: SignerWithAddress,
      oracle: SignerWithAddress;

    before("deploy the Provider", async () => {
      [owner, oracle] = await getFixedGasSigners(10000000);
      sut = await deployContract(owner, SimplePriceProviderArtifact) as SimplePriceProvider;
    });

    it("should set the oracle", async () => {
      await sut.setOracle(oracle.address);
    });

    it("should allow to set the price only for oracle", async () => {
      await expect(sut.setPrice(toBytes32('USD'), toWei("0.5")))
        .to.be.revertedWith("SimplePriceProvider: caller is not the oracle");
    });

    it("should set single price", async () => {
      await sut.connect(oracle).setPrice(toBytes32('USD'), toWei("0.5"));
      const price = fromWei(await sut.getPrice(toBytes32('USD')));
      expect(price).to.be.closeTo(0.5, 0.000001);
    });

    it("should set multiple prices", async () => {
      await sut.connect(oracle).setPrice(toBytes32('ETH'), toWei("0.1"));
      await sut.connect(oracle).setPrice(toBytes32('BTC'), toWei("0.01"));

      const ethPrice = fromWei(await sut.getPrice(toBytes32('ETH')));
      const btcPrice = fromWei(await sut.getPrice(toBytes32('BTC')));

      expect(ethPrice).to.be.closeTo(0.1, 0.000001);
      expect(btcPrice).to.be.closeTo(0.01, 0.000001);
    });
  });

});

