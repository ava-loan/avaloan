// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

/**
 * @title IPriceProvider
 * @dev Interface that provides current price in AVAX for a given asset
 */
interface IPriceProvider {

  /**
   * Returns the current price of an asset
   * @dev _asset the address of the queried asset
  **/
  function getPrice(bytes32 _asset) external view returns(uint256);


  /**
   * Returns all the supported assets
  **/
  function getAllAssets() external view returns(bytes32[] memory);

}
