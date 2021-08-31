// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@pangolindex/exchange-contracts/contracts/pangolin-periphery/PangolinRouter.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPriceProvider.sol";
import "./IAssetsExchange.sol";

/**
 * @title PangolinAssetsExchange
 * @dev Contract allows user to invest into an asset
 * This implementation uses the Pangolin DEX
 */
contract PangolinAssetsExchange is Ownable, IAssetsExchange {
  mapping(bytes32 => address) assetAddress;

  IPangolinRouter public pangolinRouter;
  IPriceProvider public priceProvider;

  /* ========= MODIFIERS ========= */

  modifier RefundRemainder {
    uint256 initial_balance = getInitialBalance();
    _;
    if (address(this).balance > initial_balance) {
      (bool success,) = msg.sender.call{ value: address(this).balance - initial_balance }("");
      require(success, "Refund failed");
    }
  }

  /* ========== SETTERS ========== */

  /**
   * Sets a new address to a chosen asset
   * @dev _asset The code of the ERC20 asset
   * @dev _address The address of a ERC20 compatible asset
  **/
  function setAssetAddress(bytes32 _asset, address _address) external onlyOwner {
    assetAddress[_asset] = _address;
  }

  /**
   * Sets the new oracle
   * The oracle is an entity authorised to set assets prices
   * @dev _oracle the address of the new oracle
  **/
  function setPriceProvider(IPriceProvider _priceProvider) public onlyOwner {
    require(address(_priceProvider) != address(0), "The price provider cannot set to a null address");

    priceProvider = _priceProvider;

    emit PriceProviderChanged(address(priceProvider));
  }

  /* ========== MUTATIVE FUNCTIONS ========== */


  /**
   * Buys selected asset with AVAX using the Pangolin DEX
   * Refunds unused AVAX to the msg.sender
   * @dev _asset asset code
   * @dev _amount amount to be bought
  **/
  function buyAsset(bytes32 _asset, uint256 _amount) payable override external RefundRemainder{
    uint256 amountIn = _amount * priceProvider.getPrice(_asset) / 1 ether;
    require(amountIn > 0, "Incorrect input amount");
    require(msg.value >= amountIn, "Not enough funds provided");

    pangolinRouter.swapAVAXForExactTokens{ value: msg.value }(_amount, getPathForAVAXtoToken(_asset), msg.sender, block.timestamp);
  }


  /**
   * Sells selected asset for AVAX
   * @dev _asset asset code
   * @dev _amount amount to be bought
  **/
  function sellAsset(bytes32 _asset, uint256 _amount) payable override external {

    uint256 amountOut = _amount * priceProvider.getPrice(_asset) / 1 ether;
    require(amountOut > 0, "Incorrect output amount");

    IERC20 token = IERC20(assetAddress[_asset]);
    token.approve(address(pangolinRouter), tokenInAmount);
    pangolinRouter.swapExactTokensForAVAX(tokenInAmount, minAmountOut, getPathForTokenToAVAX(asset), msg.sender, block.timestamp);

    payable(msg.sender).transfer(amountOut);
  }



  /* ========== VIEW FUNCTIONS ========== */

  /**
   * Returns the balance of this contract before the current call's msg.value was added
   * The return value can be further used to calculate the AVAX remainder to refund
  **/
  function getInitialBalance() internal view returns (uint256) {
    if (address(this).balance <= msg.value) {
      return 0;
    } else {
      return address(this).balance - msg.value;
    }
  }

  /**
   * Returns a path containing WAVAX token's address and chosen asset's address
   * @dev _asset The code for the asset
   * @dev _user the address of queried user
  **/
  function getPathForAVAXtoToken(bytes32 _asset) private view returns (address[] memory) {
    require(assetAddress[_asset] != address(0), 'This asset is not supported.');
    address[] memory path = new address[](2);
    path[0] = pangolinRouter.WAVAX();
    path[1] = assetAddress[_asset];
    return path;
  }

  function getPathForTokenToAVAX(bytes32 _asset) private view returns (address[] memory) {
    require(assetAddress[_asset] != address(0), 'This asset is not supported.');
    address[] memory path = new address[](2);
    path[0] = assetAddress[_asset];
    path[1] = pangolinRouter.WAVAX();
    return path;
  }


  /* ========== EVENTS ========== */


  /**
    * @dev emitted after the owner changes the price provider
    * @param priceProvider the address of a new price provider
  **/
  event PriceProviderChanged(address indexed priceProvider);

}

