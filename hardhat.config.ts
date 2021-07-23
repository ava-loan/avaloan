import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import "hardhat-watcher";

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
  },
  watcher: {
    compilation: {
      tasks: ["compile"],
      files: ["./contracts"],
      verbose: true,
    },
    ci: {
      tasks: [
        "clean",
        {command: "compile", params: {quiet: true}},
        {command: "test", params: {noCompile: true}}
      ],
    },
    test: {
      tasks: [{command: 'test', params: {noCompile: true, testFiles: ['{path}']}}],
      files: ['./test/ts/**/*'],
      verbose: true
    }
  },
  mocha: {
    "allow-uncaught": true
  }
};
