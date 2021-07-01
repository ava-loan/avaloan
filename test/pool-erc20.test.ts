import {ethers, waffle} from "hardhat"
import chai, {expect} from "chai"
import {solidity} from "ethereum-waffle";

import FixedRatesCalculatorArtifact from "../artifacts/contracts/FixedRatesCalculator.sol/FixedRatesCalculator.json";
import PoolArtifact from "../artifacts/contracts/Pool.sol/Pool.json";
import OpenBorrowersRegistryArtifact
  from "../artifacts/contracts/OpenBorrowersRegistry.sol/OpenBorrowersRegistry.json";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, time, toWei} from "./_helpers";
import {FixedRatesCalculator, OpenBorrowersRegistry, Pool} from "../typechain";

chai.use(solidity);

const {deployContract} = waffle;

describe("Pool ERC20 token functions", () => {
  let sut: Pool,
    owner: SignerWithAddress,
    depositor: SignerWithAddress,
    depositor2: SignerWithAddress,
    recipient: SignerWithAddress,
    recipient2: SignerWithAddress,
    recipient3: SignerWithAddress,
    sender: SignerWithAddress,
    fixedRatesCalculator: FixedRatesCalculator;

  // shortcut to Pool.balanceOf with conversion to ethers.
  async function balanceOf(user: SignerWithAddress): Promise<number> {
    return fromWei(await sut.balanceOf(user.address));
  }

  beforeEach(async () => {
    [owner, depositor, depositor2, recipient, recipient2, recipient3, sender] = await ethers.getSigners();
    fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
    sut = (await deployContract(owner, PoolArtifact)) as Pool;
    await sut.setRatesCalculator(fixedRatesCalculator.address);

    let borrowersRegistry = (await deployContract(owner, OpenBorrowersRegistryArtifact)) as OpenBorrowersRegistry;
    await sut.setBorrowersRegistry(borrowersRegistry.address);
  });

  describe("transfer", () => {

    it("should revert if not enough balance", async () => {
      await sut.connect(depositor).deposit({value: toWei("1.0")});

      await expect(sut.connect(depositor).transfer(recipient.address, toWei("1.1")))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("should accumulate sender interests prior transferring the funds", async () => {
      // given
      await sut.connect(depositor).deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(1));

      // note: after accumulating interests sender should be able to transfer
      // more funds than originally deposited
      // when
      await sut.connect(depositor).transfer(recipient.address, toWei("1.04"));

      // then
      expect(await balanceOf(recipient)).to.be.equal(1.04);
      expect(await balanceOf(depositor)).to.be.closeTo(0.011271, 0.000001);
    });

    it("should accumulate recipient interests prior transferring the funds", async () => {
      // given
      await sut.connect(depositor).deposit({value: toWei("1.0")});
      await sut.connect(recipient).deposit({value: toWei("2.0")});
      await time.increase(time.duration.years(1));

      // when
      await sut.connect(depositor).transfer(recipient.address, toWei("1.05"));

      // then
      expect(await balanceOf(depositor)).to.be.closeTo(0.001271, 0.000001);
      expect(await balanceOf(recipient)).to.be.closeTo(3.152542, 0.000001);
    });

  });

  describe("approve", () => {
    it("should revert if value to approve higher than current balance", async () => {
      await sut.connect(depositor).deposit({value: toWei("1.0")});

      await expect(sut.connect(depositor).approve(recipient.address, toWei("1.01")))
        .to.be.revertedWith("ERC20: approve amount exceeds balance");

    });

    it("should revert if value to approve higher than current balance (after accumulating interest)", async () => {
      await sut.connect(depositor).deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(1));

      await expect(sut.connect(depositor).approve(recipient.address, toWei("1.06")))
        .to.be.revertedWith("ERC20: approve amount exceeds balance");
    });

    it("should properly accumulate interest rate before approving", async () => {
      // given
      await sut.connect(depositor).deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(1));

      // when
      // note: even though only 1.0 was deposited, 1.05 can be approved
      // thanks to interests being accumulated
      await sut.connect(depositor).approve(recipient.address, toWei("1.05"));

      // then
      expect(fromWei(await sut.allowance(depositor.address, recipient.address)))
        .to.be.equal(1.05);
    });

    it("should properly assign amount to different spenders within one owner", async () => {
      await sut.connect(depositor).deposit({value: toWei("5.0")});


      await sut.connect(depositor).approve(recipient.address, toWei("1.05"));
      await sut.connect(depositor).approve(recipient2.address, toWei("2.03"));
      await sut.connect(depositor).approve(recipient3.address, toWei("1.27"));

      // then
      expect(fromWei(await sut.allowance(depositor.address, recipient.address)))
        .to.be.equal(1.05);
      expect(fromWei(await sut.allowance(depositor.address, recipient2.address)))
        .to.be.equal(2.03);
      expect(fromWei(await sut.allowance(depositor.address, recipient3.address)))
        .to.be.equal(1.27);
    });

    it("should properly assign amount to different spenders for different owners", async () => {
      // given
      await sut.connect(depositor).deposit({value: toWei("5.0")});
      await sut.connect(depositor2).deposit({value: toWei("3.0")});

      // when
      await sut.connect(depositor).approve(recipient.address, toWei("2.33"));
      await sut.connect(depositor).approve(recipient2.address, toWei("1.89"));
      await sut.connect(depositor2).approve(recipient2.address, toWei("1.89"));
      await sut.connect(depositor2).approve(recipient3.address, toWei("2.33"));

      // then
      expect(fromWei(await sut.allowance(depositor.address, recipient.address)))
        .to.be.equal(2.33);
      expect(fromWei(await sut.allowance(depositor.address, recipient2.address)))
        .to.be.equal(1.89);
      expect(fromWei(await sut.allowance(depositor.address, recipient3.address)))
        .to.be.equal(0);

      expect(fromWei(await sut.allowance(depositor2.address, recipient.address)))
        .to.be.equal(0);
      expect(fromWei(await sut.allowance(depositor2.address, recipient2.address)))
        .to.be.equal(1.89);
      expect(fromWei(await sut.allowance(depositor2.address, recipient3.address)))
        .to.be.equal(2.33);
    });
  })

  describe("transferFrom", () => {
    it("should revert if amount higher than sender balance", async () => {
      await sut.connect(depositor).deposit({value: toWei("1.0")});

      await expect(sut.transferFrom(depositor.address, recipient.address, toWei("1.01")))
        .to.be.revertedWith("Not enough tokens to transfer required amount.");
    });

    it("should revert if caller's allowance for sender's tokens is too low", async () => {
      await sut.connect(depositor).deposit({value: toWei("1.0")});
      await sut.connect(depositor).approve(recipient.address, toWei("0.5"));

      await expect(sut.transferFrom(depositor.address, recipient.address, toWei("0.55")))
        .to.be.revertedWith("Not enough tokens allowed to transfer required amount.");
    });

    it("should decrease allowance by the transfer amount", async () => {
      await sut.connect(depositor).deposit({value: toWei("1.0")});
      await sut.connect(depositor).approve(sender.address, toWei("0.5"));

      await sut.connect(sender).transferFrom(depositor.address, recipient2.address, toWei("0.4"));
      expect(fromWei(await sut.allowance(depositor.address, sender.address)))
        .to.be.equal(0.1);
    });

    it("should decrease balance of the sender", async () => {
      await sut.connect(depositor).deposit({value: toWei("2.0")});
      await sut.connect(depositor).approve(sender.address, toWei("1.5"));

      await sut.connect(sender).transferFrom(depositor.address, recipient2.address, toWei("1.2"));
      expect(await balanceOf(depositor)).to.be.closeTo(0.8, 0.000001);
    });

    it("should not decrease balance of the msg.sender", async () => {
      await sut.connect(depositor).deposit({value: toWei("3.9")});
      await sut.connect(sender).deposit({value: toWei("5.2")});
      await sut.connect(recipient2).deposit({value: toWei("4.0")});
      await sut.connect(depositor).approve(sender.address, toWei("2.0"));

      await sut.connect(sender).transferFrom(depositor.address, recipient2.address, toWei("0.89"));

      expect(await balanceOf(sender)).to.be.closeTo(5.2, 0.00001);
    });

    it("should increase balance of the recipient", async () => {
      await sut.connect(depositor).deposit({value: toWei("3.9")});
      await sut.connect(recipient2).deposit({value: toWei("1.0")});
      await sut.connect(depositor).approve(sender.address, toWei("0.9"));

      await sut.connect(sender).transferFrom(depositor.address, recipient2.address, toWei("0.89"));
      expect(await balanceOf(recipient2)).to.be.closeTo(1.89, 0.000001);
    });

    it("should accumulate interests of the sender and recipient", async () => {
      await sut.connect(depositor).deposit({value: toWei("3.9")});
      await sut.connect(recipient2).deposit({value: toWei("1.0")});
      await sut.connect(depositor).approve(sender.address, toWei("3.9"));

      await time.increase(time.duration.years(5));
      await sut.connect(sender).transferFrom(depositor.address, recipient2.address, toWei("1.0"));

      expect(await balanceOf(depositor)).to.be.closeTo(3.723673, 0.000001);
      expect(await balanceOf(recipient2)).to.be.closeTo(2.2840254, 0.000001);
    });
  });

  describe("totalSupply", () => {
    it("should properly sum total tokens supply - minting", async () => {
      await sut.connect(depositor).deposit({value: toWei("4.06")});
      await sut.connect(recipient).deposit({value: toWei("3.1")});
      await sut.connect(recipient2).deposit({value: toWei("12.14")});
      await sut.connect(recipient3).deposit({value: toWei("4.354")});
      await sut.connect(sender).deposit({value: toWei("12.64")});

      expect(fromWei(await sut.totalSupply())).to.be.equal(36.294);
    });

    it("should properly sum total tokens supply - minting and burning", async () => {
      await sut.connect(depositor).deposit({value: toWei("4.06")});
      await sut.connect(recipient).deposit({value: toWei("3.1")});
      await sut.connect(depositor).withdraw(toWei("2.0"));
      await sut.connect(recipient).withdraw(toWei("1.5"));

      expect(fromWei(await sut.totalSupply())).to.be.closeTo(3.660000, 0.000001);
    });

    xit("should properly sum total tokens supply with accumulated interests - minting", async () => {
      await sut.connect(depositor).deposit({value: toWei("4.06")});
      await sut.connect(recipient).deposit({value: toWei("3.1")});
      await sut.connect(recipient2).deposit({value: toWei("12.14")});
      await sut.connect(recipient3).deposit({value: toWei("4.354")});
      await sut.connect(sender).deposit({value: toWei("12.64")});

      await time.increase(time.duration.years(1));

      // TODO: the sum should be increased by the accumulated interest - or not?
      expect(fromWei(await sut.totalSupply())).not.to.be.equal(36.294);
    });


  });

});
