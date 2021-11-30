// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@pangolindex/exchange-contracts/contracts/pangolin-periphery/interfaces/IPangolinRouter.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IAssetsExchange.sol";
import "./SupportedAssets.sol";

/**
 * @title PangolinExchange
 * @dev Contract allows user to invest into an ERC20 token
 * This implementation uses the Pangolin DEX
 */
contract PangolinExchange is Ownable, IAssetsExchange, ReentrancyGuardUpgradeable {
  /* ========= STATE VARIABLES ========= */
  IPangolinRouter pangolinRouter;
  SupportedAssets supportedAssets;

  /* ========= CONSTRUCTOR ========= */

  constructor (address _pangolinRouter, SupportedAssets _supportedAssets) {
    pangolinRouter = IPangolinRouter(_pangolinRouter);
    supportedAssets = _supportedAssets;
  }

  /* ========= MODIFIERS ========= */

  function refundAvaxBalance() private {
    if (address(this).balance > 0) {
      (bool refund_success,) = msg.sender.call{value : address(this).balance}("");
      require(refund_success, "Refund failed");
    }
  }


  function refundTokenBalance(bytes32 _asset) private  {
    address tokenAddress = supportedAssets.getAssetAddress(_asset);
    IERC20 token = IERC20(tokenAddress);
    token.transfer(msg.sender, token.balanceOf(address(this)));
  }


  /**
   * Buys selected ERC20 token with AVAX using the Pangolin DEX
   * Refunds unused AVAX to the msg.sender
   * @dev _token ERC20 token's address
   * @dev _exactERC20AmountOut amount of the ERC20 token to be bought
  **/
  function buyAsset(bytes32 _token, uint256 _exactERC20AmountOut) payable external override nonReentrant returns(bool){
    require(_exactERC20AmountOut > 0, "Amount of tokens to buy has to be greater than 0");
    address tokenAddress = supportedAssets.getAssetAddress(_token);
    uint256 amountIn = getEstimatedAVAXForERC20Token(_exactERC20AmountOut, tokenAddress);
    require(msg.value >= amountIn, "Not enough funds provided");

    address[] memory path = getPathForAVAXtoToken(tokenAddress);
    (bool success,) = address(pangolinRouter).call{value : msg.value}(abi.encodeWithSignature("swapAVAXForExactTokens(uint256,address[],address,uint256)", _exactERC20AmountOut, path, msg.sender, block.timestamp));

    refundAvaxBalance();
    emit TokenPurchase(msg.sender, _exactERC20AmountOut, block.timestamp, success);
    return success;
  }


  /**
   * Sells selected ERC20 token for AVAX
   * @dev _token ERC20 token's address
   * @dev _exactERC20AmountIn amount of the ERC20 token to be sold
   * @dev _minAvaxAmountOut minimum amount of the AVAX token to be bought
  **/
  function sellAsset(bytes32 _token, uint256 _exactERC20AmountIn, uint256 _minAvaxAmountOut) external override returns(bool){
    require(_exactERC20AmountIn > 0, "Amount of tokens to sell has to be greater than 0");

    address tokenAddress = supportedAssets.getAssetAddress(_token);
    IERC20 token = IERC20(tokenAddress);
    token.approve(address(pangolinRouter), _exactERC20AmountIn);

    (bool success,) = address(pangolinRouter).call{value : 0}(
      abi.encodeWithSignature("swapExactTokensForAVAX(uint256,uint256,address[],address,uint256)", _exactERC20AmountIn, _minAvaxAmountOut, getPathForTokenToAVAX(tokenAddress), msg.sender, block.timestamp)
    );

    if (!success) {
      refundTokenBalance(_token);
      return false;
    }
    refundAvaxBalance();
    emit TokenSell(msg.sender, _exactERC20AmountIn, block.timestamp, success);
    return true;
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
     * Returns the minimum token amount that is required to be sold to receive _exactAmountOut of AVAX.
  **/
  function getMinimumERC20TokenAmountForExactAVAX(uint256 _exactAmountOut, address _token) public view override returns (uint256) {
    address[] memory path = getPathForTokenToAVAX(_token);

    return pangolinRouter.getAmountsIn(_exactAmountOut, path)[0];
  }


  /**
     * Returns the minimum AVAX amount that is required to buy _exactAmountOut of _token ERC20 token.
  **/
  function getEstimatedAVAXForERC20Token(uint256 _exactAmountOut, address _token) public view returns (uint256) {
    address[] memory path = getPathForAVAXtoToken(_token);

    return pangolinRouter.getAmountsIn(_exactAmountOut, path)[0];
  }

  /**
   * Returns the maximum AVAX amount that will be obtained in the event of selling _amountIn of _token ERC20 token.
  **/
  function getEstimatedAVAXFromERC20Token(uint256 _amountIn, address _token) public view override returns (uint256) {
    address[] memory path = getPathForTokenToAVAX(_token);

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
  event TokenPurchase(address indexed buyer, uint amount, uint256 timestamp, bool success);

  /**
  * @dev emitted after a tokens were sold
  * @param seller the address which sold tokens
  * @param amount the amount of token sold
  **/
  event TokenSell(address indexed seller, uint amount, uint256 timestamp, bool success);
}
