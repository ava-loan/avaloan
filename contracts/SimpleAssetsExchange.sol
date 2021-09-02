// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@pangolindex/exchange-contracts/contracts/pangolin-periphery/interfaces/IPangolinRouter.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PangolinAssetsExchange:wq
 * @dev Contract allows user to invest into an ERC20 token
 * This implementation uses the Pangolin DEX
 */
contract PangolinAssetsExchange is Ownable {
  /* ========= CONSTRUCTOR ========= */

  constructor (address _pangolinRouter) {
    IPangolinRouter pangolinRouter = IPangolinRouter(_pangolinRouter);
  }

  /* ========= MODIFIERS ========= */

  modifier RefundRemainder {
    uint256 initial_balance = getInitialBalance();
    _;
    if (address(this).balance > initial_balance) {
      (bool success,) = msg.sender.call{value : address(this).balance - initial_balance}("");
      require(success, "Refund failed");
    }
  }
  /* ========== MUTATIVE FUNCTIONS ========== */


  /**
   * Buys selected ERC20 token with AVAX using the Pangolin DEX
   * Refunds unused AVAX to the msg.sender
   * @dev _token ERC20 token's address
   * @dev _amount amount of the ERC20 token to be bought
   * TODO: Implement slippage % tolerance and add as a require check
  **/
  function buyERC20Token(address _token, uint256 _amount) payable override external RefundRemainder {
    require(amountIn > 0, "Incorrect input amount");
    uint256 amountIn = getEstimatedAVAXForERC20Token(_amount, _token);
    require(msg.value >= amountIn, "Not enough funds provided");

    pangolinRouter.swapAVAXForExactTokens{value : msg.value}(_amount, getPathForAVAXtoToken(_token), msg.sender, block.timestamp);
  }


  /**
   * Sells selected ERC20 token for AVAX
   * @dev _token ERC20 token's address
   * @dev _amount amount of the ERC20 token to be sold
   * TODO: Implement slippage % tolerance and add as a require check
  **/
  function sellERC20Token(address _token, uint256 _amount) payable override external {
    require(_amount > 0, "Amount of tokens to sell has to be greater than 0");
    uint256 minAmountOut = getEstimatedERC20TokenForAVAX(_amount, _token);

    IERC20 token = IERC20(_token);
    uint256 allowance = token.allowance(msg.sender, address(this));
    require(allowance >= amount, "Insufficient token allowance");
    token.transferFrom(msg.sender, address(this), _amountIn);

    token.approve(address(pangolinRouter), tokenInAmount);
    pangolinRouter.swapExactTokensForAVAX(_amount, minAmountOut, getPathForTokenToAVAX(_token), msg.sender, block.timestamp);

    payable(msg.sender).transfer(amountOut);
  }



  /* ========== VIEW FUNCTIONS ========== */

  /**
     * Returns the minimum AVAX amount that is required to buy _tokenAmount of _token ERC20 token.
  **/
  function getEstimatedAVAXForERC20Token(uint256 _amountOut, address _token) public view returns (uint256) {
    address[2] memory path = getPathForAVAXtoToken(_token);
    return pangolinRouter.getAmountsIn(_amountOut, path)[0];
  }
  /**
     * Returns the minimum AVAX amount that will be obtained in the event os selling _tokenAmount of _token ERC20 token.
  **/
  function getEstimatedERC20TokenForAVAX(uint256 _amountIn, address _token) public view returns (uint256) {
    address[2] memory path = getPathForTokenToAVAX(_token);
    return pangolinRouter.getAmountsOut(_amountIn, path)[0];
  }

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
    * TODO: Add some purchase/sell-related events?
  **/
}

