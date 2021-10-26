import config from "@/config";
const ethers = require('ethers');

export function calculateCollateral(amount) {
    if (amount) {
        return config.DEFAULT_COLLATERAL_RATIO * amount - amount;
    }
}

export function maximumSlippage(currentSlippage) {
    return currentSlippage + config.SLIPPAGE_TOLERANCE;
}

export function maxAvaxToBeSold(amount, currentSlippage) {
  return (1 + maximumSlippage(currentSlippage)) * amount;
}

export function minAvaxToBeBought(amount, currentSlippage) {
  return amount / (1 + maximumSlippage(currentSlippage));
}

export const fromWei = val => parseFloat(ethers.utils.formatEther(val));
export const toWei = ethers.utils.parseEther;
export const parseUnits = ethers.utils.parseUnits;
export const formatUnits = ethers.utils.formatUnits;
