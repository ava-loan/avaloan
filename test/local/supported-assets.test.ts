import {ethers, waffle} from 'hardhat'
import chai from 'chai'
import {solidity} from "ethereum-waffle";

import SupportedAssetsArtifact from '../../artifacts/contracts/SupportedAssets.sol/SupportedAssets.json';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {getFixedGasSigners, toBytes32, fromBytes32} from "../_helpers";
import {SupportedAssets} from "../../typechain";

chai.use(solidity);

const {deployContract, loadFixture} = waffle;
const {expect} = chai;

const token1Address = '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70';
const token2Address = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7';
const token3Address = '0x5947bb275c521040051d82396192181b413227a3';

describe('SupportedAssets', () => {
  async function snapshotedContract() {
    let contract: SupportedAssets,
    owner: SignerWithAddress;

    [owner] = await getFixedGasSigners(10000000);
    contract = await deployContract(owner, SupportedAssetsArtifact) as SupportedAssets;
    return contract;
  }

  describe('Set and read assets', () => {
    let sut: SupportedAssets;

    beforeEach("load deployed contract", async () => {
      sut = await loadFixture(snapshotedContract);
    });

    it("should add new assets", async () => {
      let token1 = "TOKEN_1";
      let token2 = "TOKEN_2";

      await sut.setAsset(toBytes32(token1), token1Address);
      await sut.setAsset(toBytes32(token2), token2Address);

      await expect((fromBytes32((await sut.getAllAssets())[0])))
       .to.be.equal(token1);

      await expect((fromBytes32((await sut.getAllAssets())[1])))
       .to.be.equal(token2);

      await expect((await sut.getAssetAddress(toBytes32(token1))))
       .to.be.equal(token1Address);

      await expect((await sut.getAssetAddress(toBytes32(token2))))
       .to.be.equal(token2Address);
    });

    it("should correctly remove an asset", async () => {
      let token1 = "TOKEN_1";
      let token2 = "TOKEN_2";
      let token3 = "TOKEN_3";

      await sut.setAsset(toBytes32(token1), token1Address);
      await sut.setAsset(toBytes32(token2), token2Address);
      await sut.setAsset(toBytes32(token3), token3Address);

      await sut.removeSupportedAsset(toBytes32(token2));

      await expect((await sut.getAllAssets()).includes(token2))
        .to.be.false
      await expect(((await sut.getAllAssets()).map(
        el => fromBytes32(el)
      )).join(","))
        .to.be.equal("TOKEN_1,TOKEN_3")
      await expect(sut.getAssetAddress(toBytes32(token2)))
        .to.be.revertedWith("Asset not supported.");
    });

    it("should not set already supported asset", async () => {
      let token1 = "TOKEN_1";

      await sut.setAsset(toBytes32(token1), token1Address);

      await expect(sut.setAsset(toBytes32(token1), token1Address))
        .to.be.revertedWith("Cannot set an asset that has already been set.");
    });
  

    it("should not set an empty string asset", async () => {
      await expect(sut.setAsset(toBytes32(""), token1Address))
        .to.be.revertedWith("Cannot set an empty string asset.");
    })


    it("should not update an asset that has not been set.", async () => {
      await expect(sut.updateAssetAddress(toBytes32("INVALID_TOKEN"), token1Address))
        .to.be.revertedWith("Cannot update an asset that has not been set.");
    })
  });
});

