// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@pangolindex/exchange-contracts/contracts/pangolin-periphery/interfaces/IPangolinRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IAssetsExchange.sol";
import "./SupportedAssets.sol";

/**
 * @title PangolinExchange
 * @dev Contract allows user to invest into an ERC20 token
 * This implementation uses the Pangolin DEX
 */
contract PangolinExchange is Ownable, IAssetsExchange {
  /* ========= STATE VARIABLES ========= */
  IPangolinRouter pangolinRouter;
  SupportedAssets supportedAssets;

  /* ========= CONSTRUCTOR ========= */

  constructor (address _pangolinRouter, SupportedAssets _supportedAssets) {
    pangolinRouter = IPangolinRouter(_pangolinRouter);
    supportedAssets = _supportedAssets;
  }

  /* ========= MODIFIERS ========= */

  modifier RefundRemainder {
    _;
    if (address(this).balance > 0) {
      (bool success,) = msg.sender.call{value : address(this).balance}("");
      require(success, "Refund failed");
    }
  }


  /**
   * Buys selected ERC20 token with AVAX using the Pangolin DEX
   * Refunds unused AVAX to the msg.sender
   * @dev _token ERC20 token's address
   * @dev _amount amount of the ERC20 token to be bought
   * TODO: Implement slippage % tolerance and add as a require check
  **/
  function buyAsset(bytes32 _token, uint256 _amount) payable external override RefundRemainder {
    require(_amount > 0, "Amount of tokens to buy has to be greater than 0");

    address tokenAddress = supportedAssets.getAssetAddress(_token);

    uint256 amountIn = getEstimatedAVAXForERC20Token(_amount, tokenAddress);

    require(msg.value >= amountIn, "Not enough funds provided");

    pangolinRouter.swapAVAXForExactTokens{value : msg.value}(_amount, getPathForAVAXtoToken(tokenAddress), msg.sender, block.timestamp);

    emit TokenPurchase(msg.sender, _amount, block.timestamp);
  }


  /**
   * Sells selected ERC20 token for AVAX
   * @dev _token ERC20 token's address
   * @dev _amount amount of the ERC20 token to be sold
  **/
  function sellAsset(bytes32 _token, uint256 _amount) external override RefundRemainder {
    require(_amount > 0, "Amount of tokens to sell has to be greater than 0");
    address tokenAddress = supportedAssets.getAssetAddress(_token);
    uint256 minAmountOut = getEstimatedERC20TokenForAVAX(_amount, tokenAddress);

    IERC20 token = IERC20(tokenAddress);
    token.approve(address(pangolinRouter), _amount);
    pangolinRouter.swapExactTokensForAVAX(_amount, minAmountOut, getPathForTokenToAVAX(tokenAddress), msg.sender, block.timestamp);

    emit TokenSell(msg.sender, _amount, block.timestamp);
  }

  /* ========== RECEIVE AVAX FUNCTION ========== */
  receive() external payable {  }


  /* ========== VIEW FUNCTIONS ========== */

  /**
    * Returns the current balance of the asset held by a given user
    * @dev _asset the code of an asset
    * @dev _user the address of queried user
  **/
  function getBalance(address _user, bytes32 _asset) external override view returns(uint256) {
    IERC20 token = IERC20(supportedAssets.getAssetAddress(_asset));
    return token.balanceOf(_user);
  }


  /**
     * Returns the minimum AVAX amount that is required to buy _amountOut of _token ERC20 token.
  **/
  function getEstimatedAVAXForERC20Token(uint256 _amountOut, address _token) public view returns (uint256) {
    address[] memory path = getPathForAVAXtoToken(_token);

    return pangolinRouter.getAmountsIn(_amountOut, path)[0];
  }

  /**
     * Returns the maximum AVAX amount that will be obtained in the event os selling _amountIn of _token ERC20 token.
  **/
  function getEstimatedERC20TokenForAVAX(uint256 _amountIn, address _token) public view returns (uint256) {
    address[] memory path = getPathForAVAXtoToken(_token);

    return pangolinRouter.getAmountsOut(_amountIn, path)[1];
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
  * @dev emitted after a tokens were purchased
  * @param buyer the address which bought tokens
  * @param amount the amount of token bought
  **/
  event TokenPurchase(address indexed buyer, uint amount, uint256 timestamp);

  /**
  * @dev emitted after a tokens were sold
  * @param seller the address which sold tokens
  * @param amount the amount of token sold
  **/
  event TokenSell(address indexed seller, uint amount, uint256 timestamp);
}
