// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "../SmartLoan.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

/**
 * @title MockUpgradedSmartLoan
 * @dev A mock implementation of a SmartLoan to check if upgrade mechanism correctly update contrac logic
 */
contract MockUpgradedSmartLoan is SmartLoan {

  /**
   * Dummy implementation recording double deposits
   * used to test upgrade of contract logic
  **/
  function getTotalValue() public override pure returns(uint256) {
    return 777;
  }

}
