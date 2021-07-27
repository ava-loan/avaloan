# Avaloan - Smart Loans on the Avalanche blockchain

## Minimum reproducible example
for issue [link](https://github.com/nomiclabs/hardhat/issues/1721).    

In order to reproduce:
1. `yarn install`
2. `yarn hardhat compile`
3. `yarn hardhat test`

Running tests on an Intel-based CPU should result in an errors similar to:
```
1) Pool with fixed interests rates (2)
       should properly make multiple deposits
         should properly make another deposits with different time gaps:
     Error: Transaction reverted: contract call run out of gas and made the transaction revert
      at CompoundingIndex.updateIndex (contracts/CompoundingIndex.sol:103)
      at CompoundingIndex.setRate (contracts/CompoundingIndex.sol:45)
      at Pool.updateRates (contracts/Pool.sol:200)
      at Pool.deposit (contracts/Pool.sol:92)
      at processTicksAndRejections (internal/process/task_queues.js:93:5)
      at HardhatNode._mineBlockWithPendingTxs (node_modules/hardhat/src/internal/hardhat-network/provider/node.ts:1575:23)
      at HardhatNode.mineBlock (node_modules/hardhat/src/internal/hardhat-network/provider/node.ts:443:16)
      at EthModule._sendTransactionAndReturnHash (node_modules/hardhat/src/internal/hardhat-network/provider/modules/eth.ts:1500:18)
      at HardhatNetworkProvider.request (node_modules/hardhat/src/internal/hardhat-network/provider/provider.ts:106:18)
      at EthersProviderWrapper.send (node_modules/@nomiclabs/hardhat-ethers/src/internal/ethers-provider-wrapper.ts:13:20)
```


## Development

This project was funded by the Avalanche-X grant programme.
