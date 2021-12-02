// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";


/**
 * @title IAssetExchange
 * @dev Basic interface for investing into assets
 * It could be linked either to DEX or to a synthetic assets platform
 */
interface IAssetsExchange {

  /**
    * For adding supported assets
  **/
  struct Asset {
    bytes32 asset;
    address assetAddress;
  }

  /**
   * Buys selected asset with AVAX
   * @dev _asset asset code
   * @dev _exactERC20AmountOut exact amount of asset to be bought
  **/
  function buyAsset(bytes32 _asset, uint256 _exactERC20AmountOut) payable external returns(bool);


  /**
   * Sells selected asset for AVAX
   * @dev _asset asset code
   * @dev _exactERC20AmountIn amount to be bought
   * @dev _minAvaxAmountOut minimum amount of the AVAX token to be bought
  **/
  function sellAsset(bytes32 _asset, uint256 _exactERC20AmountIn, uint256 _minAvaxAmountOut) external returns(bool);


  /**
   * Returns the current balance of the asset held by given user
   * @dev _asset the code of an asset
   * @dev _user the address of queried user
  **/
  function getBalance(address _user, bytes32 _asset) external view returns(uint256);


  /**
     * Returns the maximum AVAX amount that will be obtained in the event of selling _amountIn of _token ERC20 token.
  **/
  function getEstimatedAVAXFromERC20Token(uint256 _amountIn, address _token) external returns(uint256);


  /**
       * Returns the minimum token amount that is required to be sold to receive _exactAmountOut of AVAX.
    **/
  function getMinimumERC20TokenAmountForExactAVAX(uint256 _exactAmountOut, address _token) external returns(uint256);


  /**
     * Adds or updates supported assets
     * @dev _assets assets to be added or updated
  **/
  function setAssets(Asset[] memory _assets) external;


  /**
     * Removes supported assets
     * @dev _assets assets to be removed
  **/
  function removeAssets(bytes32[] calldata _assets) external;


  /**
     * Returns all the supported assets keys
  **/
  function getAllAssets() external view returns(bytes32[] memory);


  /**
    * Returns address of an asset
  **/
  function getAssetAddress(bytes32 _asset) external view returns(address);

}
