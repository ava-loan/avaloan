const ethers = require("ethers");

//for test environments only
export async function syncTime() {
    const now = Math.ceil(new Date().getTime() / 1000);
    try {
      await ethers.provider.send('evm_setNextBlockTimestamp', [now]);
    } catch (error) {
      //Skipping time sync - block is ahead of current time
    }
}
