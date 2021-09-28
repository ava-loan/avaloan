// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";


/**
 * @title SupportedAssets
 * @dev Contract storing list of available assets for investing
 */
contract SupportedAssets is Ownable {


  mapping(bytes32 => address) assetToAddress;
  bytes32[] assetKeys;


  /* ========== SET FUNCTIONS ========== */


  function setAsset(bytes32 _asset, address _address) external onlyOwner {
    require(_asset != "", "Cannot set an empty string asset.");
    require(assetToAddress[_asset] == address(0), "Cannot set an asset that has already been set.");

    assetKeys.push(_asset);
    assetToAddress[_asset] = _address;

    emit AssetAdded(_asset);
  }


  /* ========== MUTATIVE FUNCTIONS ========== */


  /**
   * Updated supported asset defined
   * @dev _asset asset to be updated
  **/
  function updateAssetAddress(bytes32 _asset, address _address) external onlyOwner {
    require(assetToAddress[_asset] != address(0), "Cannot update an asset that has not been set.");

    assetToAddress[_asset] = _address;

    emit AssetUpdated(_asset);
  }

  
  /**
   * Adds supported asset defined
   * @dev _asset asset to be added
  **/
  function removeSupportedAsset(bytes32 _asset) external onlyOwner {
    delete assetToAddress[_asset];
    removeElement(assetKeys, _asset);

    emit AssetRemoved(_asset);
  }


  /* ========== VIEW FUNCTIONS ========== */


  /**
   * Returns all the supported assets keys
  **/
  function getAllAssets() external view returns(bytes32[] memory result) {
    return assetKeys;
  }


  /**
   * Returns address of an asset
  **/
  function getAssetAddress(bytes32 _asset) external view returns(address) {
    require(assetToAddress[_asset] != address(0), "Asset not supported.");

    return assetToAddress[_asset];
  }


  /* ========== INTERNAL FUNCTIONS ========== */



  function removeElement(bytes32[] storage _array, bytes32 _element) internal {
    uint256 index = _array.length;

    for (uint i = 0; i < _array.length - 1; i++) {
        if (_array[i] == _element) {
           index = i;
        }
    }

    if (index == _array.length) return;

    for (uint i = index; i < _array.length - 1; i++) {
        _array[i] = _array[i + 1];
    }

    _array.pop();
  }


  /* ========== EVENTS ========== */


  /**
    * @dev emitted after the owner adds asset
    * @param addedAsset added asset
  **/
  event AssetAdded(bytes32 addedAsset);


  /**
    * @dev emitted after the owner updates asset
    * @param updatedAsset updated asset
  **/
  event AssetUpdated(bytes32 updatedAsset);


  /**
    * @dev emitted after the owner removes asset
    * @param removedAsset removed asset
  **/
  event AssetRemoved(bytes32 removedAsset);


}
