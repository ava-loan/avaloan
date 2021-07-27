import '@typechain/hardhat'
import '@nomiclabs/hardhat-waffle'
import "hardhat-gas-reporter"

export default {
  solidity: "0.8.2",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000
    }
  },
  paths: {
    tests: "./test"
  }
};
