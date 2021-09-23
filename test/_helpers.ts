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

export const getFixedGasSigners = async function(gasLimit:number) {
  const signers : SignerWithAddress[] = await ethers.getSigners();
  signers.forEach(signer => {
    let orig = signer.sendTransaction;
    signer.sendTransaction = function(transaction) {
      transaction.gasLimit = BigNumber.from(gasLimit.toString());
      return orig.apply(signer, [transaction]);
    }
  });
  return signers;
};

export const deployAndInitPangolinExchangeContract = async function(owner:SignerWithAddress, pangolinRouterAddress:string) {
  const exchange = await deployContract(owner, PangolinExchangeArtifact, [pangolinRouterAddress]) as PangolinExchange;
  await exchange.updateAssetAddress(toBytes32('USD'), '0xc7198437980c041c805a1edcba50c1ce5db95118');
  await exchange.updateAssetAddress(toBytes32('ETH'), '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab');
  await exchange.updateAssetAddress(toBytes32('BTC'), '0x50b7545627a5162f82a992c33b87adc75187b218');
  await exchange.updateAssetAddress(toBytes32('LINK'), '0x5947bb275c521040051d82396192181b413227a3');

  return exchange
};
