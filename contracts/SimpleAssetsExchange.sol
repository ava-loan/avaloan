// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@pangolindex/exchange-contracts/contracts/pangolin-periphery/PangolinRouter.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPriceProvider.sol";
import "./IAssetsExchange.sol";

/**
 * @title PangolinAssetsExchange
 * @dev Contract allows user to invest into an ERC20 token
 * This implementation uses the Pangolin DEX
 */
contract PangolinAssetsExchange is Ownable, IAssetsExchange {
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
   * Buys selected ERC20 token with AVAX using the Pangolin DEX
   * Refunds unused AVAX to the msg.sender
   * @dev _token ERC20 token's address
   * @dev _amount amount of the ERC20 token to be bought
  **/
  function buyERC20Token(address _token, uint256 _amount) payable override external RefundRemainder{
    uint256 amountIn = _amount * priceProvider.getPrice(_asset) / 1 ether;
    require(amountIn > 0, "Incorrect input amount");
    require(msg.value >= amountIn, "Not enough funds provided");

    pangolinRouter.swapAVAXForExactTokens{ value: msg.value }(_amount, getPathForAVAXtoToken(_token), msg.sender, block.timestamp);
  }


  /**
   * Sells selected ERC20 token for AVAX
   * @dev _token ERC20 token's address
   * @dev _amount amount of the ERC20 token to be sold
  **/
  function sellERC20Token(address _token, uint256 _amount) payable override external {

    uint256 amountOut = _amount * priceProvider.getPrice(_asset) / 1 ether;
    require(amountOut > 0, "Incorrect output amount");

    IERC20 token = IERC20(_token);
    token.approve(address(pangolinRouter), tokenInAmount);
    pangolinRouter.swapExactTokensForAVAX(tokenInAmount, minAmountOut, getPathForTokenToAVAX(_token), msg.sender, block.timestamp);

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
   * Returns a path containing WAVAX token's address and chosen ERC20 token's address
   * @dev _token ERC20 token's address
  **/
  function getPathForAVAXtoToken(address _token) private view returns (address[] memory) {
    address[] memory path = new address[](2);
    path[0] = pangolinRouter.WAVAX();
    path[1] = _token;
    return path;
  }

  /**
    * Returns a path containing chosen ERC20 token's address and WAVAX token's address
    * @dev _token ERC20 token's address
  **/
  function getPathForTokenToAVAX(address _token) private view returns (address[] memory) {
    address[] memory path = new address[](2);
    path[0] = _token;
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

