// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

/**
 * @title DestructableContract
 * @dev For tests
 */
contract DestructableContract {

  fallback() payable external {
    //just receive funds
  }

  function destruct(address payable receiverOfFunds) public {
    selfdestruct(receiverOfFunds);
  }
}
