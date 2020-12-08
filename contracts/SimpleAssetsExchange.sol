pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPriceProvider.sol";
import "./IAssetsExchange.sol";

/**
 * @title SimpleAssetExchange
 * @dev Contract allows user to invest into an asset
 * It is a simple implementation that could be replace by a DEX or synthetic asset provider
 */
contract SimpleAssetsExchange is Ownable, IAssetsExchange {
  using SafeMath for uint256;

  mapping(address => mapping(bytes32 =>uint256)) balance;

  IPriceProvider public priceProvider;


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
   * Buys selected asset with AVAX
   * @dev _asset asset code
   * @dev _amount amount to be bought
  **/
  function buyAsset(bytes32 _asset, uint256 _amount) payable override external {
    uint256 amountIn = _amount.mul(priceProvider.getPrice(_asset)).div(1 ether);
    require(amountIn > 0, "Incorrect input amount");
    require(msg.value >= amountIn, "Not enough funds provided");

    balance[msg.sender][_asset] = balance[msg.sender][_asset].add(_amount);

    uint256 remainder = msg.value.sub(amountIn);
    msg.sender.transfer(remainder);
  }


  /**
   * Sells selected asset for AVAX
   * @dev _asset asset code
   * @dev _amount amount to be bought
  **/
  function sellAsset(bytes32 _asset, uint256 _amount) payable override external {
    require(balance[msg.sender][_asset] >= _amount, "Not enough assets to sell");

    uint256 amountOut = _amount.mul(priceProvider.getPrice(_asset)).div(1 ether);
    require(amountOut > 0, "Incorrect output amount");

    balance[msg.sender][_asset] = balance[msg.sender][_asset].sub(_amount);

    msg.sender.transfer(amountOut);
  }



  /* ========== VIEW FUNCTIONS ========== */


  /**
   * Returns the current balance of the asset held by given user
   * @dev _asset the code of an asset
   * @dev _user the address of queried user
  **/
  function getBalance(address _user, bytes32 _asset) external override view returns(uint256) {
    return balance[_user][_asset];
  }


  /* ========== EVENTS ========== */


  /**
    * @dev emitted after the owner changes the price provider
    * @param priceProvider the address of a new price provider
  **/
  event PriceProviderChanged(address indexed priceProvider);

}
