import config from "@/config";
const ethers = require('ethers');

export function calculateCollateral(amount) {
    if (amount) {
        return config.DEFAULT_COLLATERAL_RATIO * amount - amount;
    }
}

export const fromWei = val => parseFloat(ethers.utils.formatEther(val));
export const toWei = ethers.utils.parseEther;
export const parseUnits = ethers.utils.parseUnits;
export const formatUnits = ethers.utils.formatUnits;
