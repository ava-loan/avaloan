import {ethers, network, waffle} from "hardhat";
import {BigNumber} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {PangolinExchange} from "../typechain";

const {deployContract} = waffle;
import PangolinExchangeArtifact from '../artifacts/contracts/PangolinExchange.sol/PangolinExchange.json';

export const toWei = ethers.utils.parseUnits;
export const formatUnits = (val: BigNumber, decimalPlaces: BigNumber) => parseFloat(ethers.utils.formatUnits(val, decimalPlaces));
export const fromWei = (val: BigNumber) => parseFloat(ethers.utils.formatEther(val));
export const fromWeiS = (val: BigNumber) => ethers.utils.formatEther(val);
export const toBytes32 = ethers.utils.formatBytes32String;
export const fromBytes32 = ethers.utils.parseBytes32String;

export type Second = number;

export const time = {
  increase: async (duration: Second) => {
    await network.provider.send("evm_increaseTime", [duration]);
    await network.provider.send("evm_mine");
  },
  duration: {
    years: (years: number): Second => {
      return 60 * 60 * 24 * 365 * years; //TODO: leap years..
    },
    months: (months: number): Second => {
      return 60 * 60 * 24 * 30 * months; // ofc. it is simplified..
    },
    days: (days: number): Second => {
      return 60 * 60 * 24 * days;
    },
    hours: (hours: number): Second => {
      return 60 * 60 * hours;
    },
    minutes: (minutes: number): Second => {
      return 60 * minutes;
    }
  }
}

export const getSelloutRepayAmount = async function (
  totalValue: number,
  debt: number,
  bonus: number,
  targetLTV: number) {

  targetLTV = targetLTV / 1000;
  bonus = bonus / 1000;
  return (targetLTV * (totalValue - debt) - debt) / (targetLTV * bonus - 1);
};

export const getFixedGasSigners = async function (gasLimit: number) {
  const signers: SignerWithAddress[] = await ethers.getSigners();
  signers.forEach(signer => {
    let orig = signer.sendTransaction;
    signer.sendTransaction = function (transaction) {
      transaction.gasLimit = BigNumber.from(gasLimit.toString());
      return orig.apply(signer, [transaction]);
    }
  });
  return signers;
};

export const deployAndInitPangolinExchangeContract = async function (
  owner: SignerWithAddress,
  pangolinRouterAddress: string,
  supportedAssetsContractAddress: string) {
  const exchange = await deployContract(owner, PangolinExchangeArtifact, [pangolinRouterAddress, supportedAssetsContractAddress]) as PangolinExchange;

  return exchange
};

