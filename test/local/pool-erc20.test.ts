import {ethers, waffle} from "hardhat"
import chai, {expect} from "chai"
import {solidity} from "ethereum-waffle";

import FixedRatesCalculatorArtifact from "../../artifacts/contracts/FixedRatesCalculator.sol/FixedRatesCalculator.json";
import PoolArtifact from "../../artifacts/contracts/Pool.sol/Pool.json";
import OpenBorrowersRegistryArtifact
  from "../../artifacts/contracts/OpenBorrowersRegistry.sol/OpenBorrowersRegistry.json";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {fromWei, time, toWei, getFixedGasSigners} from "../_helpers";
import {FixedRatesCalculator, OpenBorrowersRegistry, Pool} from "../../typechain";

chai.use(solidity);

const {deployContract} = waffle;
const ZERO = ethers.constants.AddressZero;

describe("Pool ERC20 token functions", () => {
  let sut: Pool,
    owner: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    user3: SignerWithAddress,
    user4: SignerWithAddress,
    user5: SignerWithAddress,
    fixedRatesCalculator: FixedRatesCalculator;

  // shortcut to Pool.balanceOf with conversion to ethers.
  async function balanceOf(user: SignerWithAddress): Promise<number> {
    return fromWei(await sut.balanceOf(user.address));
  }

  beforeEach(async () => {
    [owner, user1, user2, user3, user4, user5] = await getFixedGasSigners(10000000);
    sut = (await deployContract(owner, PoolArtifact)) as Pool;

    let fixedRatesCalculator = (await deployContract(owner, FixedRatesCalculatorArtifact, [toWei("0.05"), toWei("0.1")])) as FixedRatesCalculator;
    let borrowersRegistry = (await deployContract(owner, OpenBorrowersRegistryArtifact)) as OpenBorrowersRegistry;

    await sut.initialize(fixedRatesCalculator.address, borrowersRegistry.address, ZERO, ZERO);
  });

  describe("transfer", () => {

    it("should revert if not enough balance", async () => {
      await sut.connect(user1).deposit({value: toWei("1.0")});

      await expect(sut.connect(user1).transfer(user2.address, toWei("1.1")))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("should accumulate user5 interests prior transferring the funds", async () => {
      // given
      await sut.connect(user1).deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(1));

      // note: after accumulating interests user5 should be able to transfer
      // more funds than originally deposited
      // when
      await sut.connect(user1).transfer(user2.address, toWei("1.04"));

      // then
      expect(await balanceOf(user2)).to.be.equal(1.04);
      expect(await balanceOf(user1)).to.be.closeTo(0.011271, 0.000001);
    });

    it("should accumulate user2 interests prior transferring the funds", async () => {
      // given
      await sut.connect(user1).deposit({value: toWei("1.0")});
      await sut.connect(user2).deposit({value: toWei("2.0")});
      await time.increase(time.duration.years(1));

      // when
      await sut.connect(user1).transfer(user2.address, toWei("1.05"));

      // then
      expect(await balanceOf(user1)).to.be.closeTo(0.001271, 0.000001);
      expect(await balanceOf(user2)).to.be.closeTo(3.152542, 0.000001);
    });

  });

  describe("approve", () => {
    it("should revert if value to approve higher than current balance", async () => {
      await sut.connect(user1).deposit({value: toWei("1.0")});

      await expect(sut.connect(user1).approve(user2.address, toWei("1.01")))
        .to.be.revertedWith("ERC20: approve amount exceeds balance");

    });

    it("should revert if value to approve higher than current balance (after accumulating interest)", async () => {
      await sut.connect(user1).deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(1));

      await expect(sut.connect(user1).approve(user2.address, toWei("1.06")))
        .to.be.revertedWith("ERC20: approve amount exceeds balance");
    });

    it("should properly accumulate interest rate before approving", async () => {
      // given
      await sut.connect(user1).deposit({value: toWei("1.0")});
      await time.increase(time.duration.years(1));

      // when
      // note: even though only 1.0 was deposited, 1.05 can be approved
      // thanks to interests being accumulated
      await sut.connect(user1).approve(user2.address, toWei("1.05"));

      // then
      expect(fromWei(await sut.allowance(user1.address, user2.address)))
        .to.be.equal(1.05);
    });

    it("should properly assign amount to different spenders within one owner", async () => {
      await sut.connect(user1).deposit({value: toWei("5.0")});


      await sut.connect(user1).approve(user2.address, toWei("1.05"));
      await sut.connect(user1).approve(user3.address, toWei("2.03"));
      await sut.connect(user1).approve(user4.address, toWei("1.27"));

      // then
      expect(fromWei(await sut.allowance(user1.address, user2.address)))
        .to.be.equal(1.05);
      expect(fromWei(await sut.allowance(user1.address, user3.address)))
        .to.be.equal(2.03);
      expect(fromWei(await sut.allowance(user1.address, user4.address)))
        .to.be.equal(1.27);
    });

    it("should properly assign amount to different spenders for different owners", async () => {
      // given
      await sut.connect(user1).deposit({value: toWei("5.0")});
      await sut.connect(user2).deposit({value: toWei("3.0")});

      // when
      await sut.connect(user1).approve(user2.address, toWei("2.33"));
      await sut.connect(user1).approve(user3.address, toWei("1.89"));
      await sut.connect(user2).approve(user3.address, toWei("1.89"));
      await sut.connect(user2).approve(user4.address, toWei("2.33"));

      // then
      expect(fromWei(await sut.allowance(user1.address, user2.address)))
        .to.be.equal(2.33);
      expect(fromWei(await sut.allowance(user1.address, user3.address)))
        .to.be.equal(1.89);
      expect(fromWei(await sut.allowance(user1.address, user4.address)))
        .to.be.equal(0);

      expect(fromWei(await sut.allowance(user2.address, user2.address)))
        .to.be.equal(0);
      expect(fromWei(await sut.allowance(user2.address, user3.address)))
        .to.be.equal(1.89);
      expect(fromWei(await sut.allowance(user2.address, user4.address)))
        .to.be.equal(2.33);
    });
  })

  describe("transferFrom", () => {
    it("should revert if amount higher than user5 balance", async () => {
      await sut.connect(user1).deposit({value: toWei("2.0")});
      await sut.connect(user1).approve(user2.address, toWei("2.0"));
      await sut.connect(user1).withdraw(toWei("1.0"));

      await expect(sut.connect(user2).transferFrom(user1.address, user2.address, toWei("1.01")))
        .to.be.revertedWith("Not enough tokens to transfer required amount.");
    });

    it("should revert if caller's allowance for user5's tokens is too low", async () => {
      await sut.connect(user1).deposit({value: toWei("1.0")});
      await sut.connect(user1).approve(user2.address, toWei("0.5"));

      await expect(sut.connect(user2).transferFrom(user1.address, user2.address, toWei("0.55")))
        .to.be.revertedWith("Not enough tokens allowed to transfer required amount.");
    });

    it("should decrease allowance by the transfer amount", async () => {
      await sut.connect(user1).deposit({value: toWei("1.0")});
      await sut.connect(user1).approve(user5.address, toWei("0.5"));

      await sut.connect(user5).transferFrom(user1.address, user3.address, toWei("0.4"));
      expect(fromWei(await sut.allowance(user1.address, user5.address)))
        .to.be.equal(0.1);
    });

    it("should decrease balance of the user5", async () => {
      await sut.connect(user1).deposit({value: toWei("2.0")});
      await sut.connect(user1).approve(user5.address, toWei("1.5"));

      await sut.connect(user5).transferFrom(user1.address, user3.address, toWei("1.2"));
      expect(await balanceOf(user1)).to.be.closeTo(0.8, 0.000001);
    });

    it("should not decrease balance of the msg.user5", async () => {
      await sut.connect(user1).deposit({value: toWei("3.9")});
      await sut.connect(user5).deposit({value: toWei("5.2")});
      await sut.connect(user3).deposit({value: toWei("4.0")});
      await sut.connect(user1).approve(user5.address, toWei("2.0"));

      await sut.connect(user5).transferFrom(user1.address, user3.address, toWei("0.89"));

      expect(await balanceOf(user5)).to.be.closeTo(5.2, 0.00001);
    });

    it("should increase balance of the user2", async () => {
      await sut.connect(user1).deposit({value: toWei("3.9")});
      await sut.connect(user3).deposit({value: toWei("1.0")});
      await sut.connect(user1).approve(user5.address, toWei("0.9"));

      await sut.connect(user5).transferFrom(user1.address, user3.address, toWei("0.89"));
      expect(await balanceOf(user3)).to.be.closeTo(1.89, 0.000001);
    });

    it("should accumulate interests of the user5 and user2", async () => {
      await sut.connect(user1).deposit({value: toWei("3.9")});
      await sut.connect(user3).deposit({value: toWei("1.0")});
      await sut.connect(user1).approve(user5.address, toWei("3.9"));

      await time.increase(time.duration.years(5));
      await sut.connect(user5).transferFrom(user1.address, user3.address, toWei("1.0"));

      expect(await balanceOf(user1)).to.be.closeTo(3.723673, 0.000001);
      expect(await balanceOf(user3)).to.be.closeTo(2.2840254, 0.000001);
    });
  });

  describe("totalSupply with multiple depositors", () => {
    it("should properly sum total tokens supply - minting", async () => {
      await sut.connect(user1).deposit({value: toWei("4.06")});
      await sut.connect(user2).deposit({value: toWei("3.1")});
      await sut.connect(user3).deposit({value: toWei("12.14")});
      await sut.connect(user4).deposit({value: toWei("4.354")});
      await sut.connect(user5).deposit({value: toWei("12.64")});

      let balanceOfUser1 = await balanceOf(user1);
      let balanceOfUser2 = await balanceOf(user2);
      let balanceOfUser3 = await balanceOf(user3);
      let balanceOfUser4 = await balanceOf(user4);
      let balanceOfUser5 = await balanceOf(user5);

      let sumOfBalances = balanceOfUser1 + balanceOfUser2 + balanceOfUser3 + balanceOfUser4 + balanceOfUser5;

      expect(fromWei(await sut.totalSupply())).to.be.equal(36.294);
      expect(fromWei(await sut.totalSupply())).to.be.closeTo(sumOfBalances, 0.000001);
    });

    it("should properly sum total tokens supply - minting and burning", async () => {
      await sut.connect(user1).deposit({value: toWei("4.06")});
      await sut.connect(user2).deposit({value: toWei("3.1")});
      await sut.connect(user1).withdraw(toWei("2.0"));
      await sut.connect(user2).withdraw(toWei("1.5"));

      let balanceOfUser1 = await balanceOf(user1);
      let balanceOfUser2 = await balanceOf(user2);

      expect(fromWei(await sut.totalSupply())).to.be.closeTo(3.660000, 0.000001);
      expect(fromWei(await sut.totalSupply())).to.be.closeTo(balanceOfUser1 + balanceOfUser2, 0.000001);
    });

    it("should properly sum total tokens supply with accumulated interests - minting", async () => {
      await sut.connect(user1).deposit({value: toWei("4.06")});
      await sut.connect(user2).deposit({value: toWei("3.1")});
      await sut.connect(user3).deposit({value: toWei("12.14")});
      await sut.connect(user4).deposit({value: toWei("4.354")});
      await sut.connect(user5).deposit({value: toWei("12.64")});

      await time.increase(time.duration.years(1));

      let balanceOfUser1 = await balanceOf(user1);
      let balanceOfUser2 = await balanceOf(user2);
      let balanceOfUser3 = await balanceOf(user3);
      let balanceOfUser4 = await balanceOf(user4);
      let balanceOfUser5 = await balanceOf(user5);

      expect(balanceOfUser1).to.be.closeTo( 4.268160678185977, 0.000001);
      expect(balanceOfUser2).to.be.closeTo( 3.2589404141375473, 0.000001);
      expect(balanceOfUser3).to.be.closeTo( 12.762431149968467, 0.000001);
      expect(balanceOfUser4).to.be.closeTo( 4.577234360696937, 0.000001);
      expect(balanceOfUser5).to.be.closeTo( 13.288066657666242, 0.000001);

      let sumOfBalances = balanceOfUser1 + balanceOfUser2 + balanceOfUser3 + balanceOfUser4 + balanceOfUser5;

      expect(fromWei(await sut.totalSupply())).to.be.closeTo(sumOfBalances, 0.000001);
    });

    it("should properly sum total tokens supply with accumulated interests - burning", async () => {
      await sut.connect(user1).deposit({value: toWei("4.06")});
      await sut.connect(user2).deposit({value: toWei("3.1")});

      await time.increase(time.duration.years(1));

      expect(await balanceOf(user1)).to.be.closeTo( 4.268160657884604, 0.000001);
      expect(await balanceOf(user2)).to.be.closeTo( 3.2589403986364993 , 0.000001);

      await sut.connect(user1).withdraw(toWei("2.06"));
      await sut.connect(user2).withdraw(toWei("1.1"));

      expect(await balanceOf(user1)).to.be.closeTo( 2.2081606681527437, 0.000001);
      expect(await balanceOf(user2)).to.be.closeTo( 2.1589404089705315, 0.000001);
    });

    it("should properly sum total tokens supply with accumulated interests - minting, burning and borrowing", async () => {
      await sut.connect(user1).deposit({value: toWei("3.06")});
      await sut.connect(user2).deposit({value: toWei("2.1")});

      await time.increase(time.duration.years(1));

      expect(await balanceOf(user1)).to.be.closeTo( 3.21688955988347 , 0.000001);
      expect(await balanceOf(user2)).to.be.closeTo( 2.2076693023021448, 0.000001);

      await sut.connect(user1).withdraw(toWei("2.06"));
      await sut.connect(user2).withdraw(toWei("1.1"));

      expect(await balanceOf(user1)).to.be.closeTo( 1.1568895668180512, 0.000001);
      expect(await balanceOf(user2)).to.be.closeTo( 1.107669309302618, 0.000001);

      await time.increase(time.duration.years(1));

      let balanceOfUser1 = await balanceOf(user1);
      let balanceOfUser2 = await balanceOf(user2);

      expect(balanceOfUser1).to.be.closeTo( 1.2162045632465892, 0.000001);
      expect(balanceOfUser2).to.be.closeTo( 1.1644607291664806, 0.000001);

      let sumOfBalances = balanceOfUser1 + balanceOfUser2;

      expect(fromWei(await sut.totalSupply())).to.be.closeTo(sumOfBalances, 0.000001);

      await sut.connect(user3).borrow(toWei("0.87"));

      await time.increase(time.duration.years(1));

      balanceOfUser1 = await balanceOf(user1);
      balanceOfUser2 = await balanceOf(user2);

      expect(balanceOfUser1).to.be.closeTo( 1.278560708625376, 0.000001);
      expect(balanceOfUser2).to.be.closeTo( 1.224163909330047, 0.000001);

      sumOfBalances = balanceOfUser1 + balanceOfUser2;

      expect(fromWei(await sut.totalSupply())).to.be.closeTo(sumOfBalances, 0.000001);

      await sut.connect(user3).repay({value: toWei("0.22")});

      await time.increase(time.duration.years(1));

      balanceOfUser1 = await balanceOf(user1);
      balanceOfUser2 = await balanceOf(user2);

      expect(balanceOfUser1).to.be.closeTo( 1.3441139178866284, 0.000001);
      expect(balanceOfUser2).to.be.closeTo( 1.2869281370947592, 0.000001);

      sumOfBalances = balanceOfUser1 + balanceOfUser2;

      expect(fromWei(await sut.totalSupply())).to.be.closeTo(sumOfBalances, 0.000001);
    });
  });
});
