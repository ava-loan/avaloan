// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";


/**
 * @title IAssetExchange
 * @dev Basic interface for investing into assets
 * It could be linked either to DEX or to a synthetic assets platform
 */
interface IAssetsExchange {

  /**
   * Buys selected asset with AVAX
   * @dev _asset asset code
   * @dev _amount amount to be bought
  **/
  function buyAsset(bytes32 _asset, uint256 _amount) payable external;


  /**
   * Sells selected asset for AVAX
   * @dev _asset asset code
   * @dev _amount amount to be bought
  **/
  function sellAsset(bytes32 _asset, uint256 _amount) payable external;


  /**
   * Returns the current balance of the asset held by given user
   * @dev _asset the code of an asset
   * @dev _user the address of queried user
  **/
  function getBalance(address _user, bytes32 _asset) external view returns(uint256);

}
