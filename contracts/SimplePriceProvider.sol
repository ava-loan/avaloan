// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPriceProvider.sol";

/**
 * @title SimplePriceProvider
 * @dev Contract implementing the on-chain oracle reference price contract
 * It allows an authorised oracle account to set price for an asset
 * The price is later available to query by other contracts
 */
contract SimplePriceProvider is Ownable, IPriceProvider {

  mapping(bytes32 => uint256) prices;

  bytes32 public USD = 'USD';
  bytes32 public BTC = 'BTC';
  bytes32 public ETH = 'ETH';
  bytes32 public XRP = 'XRP';
  bytes32 public LNK = 'LNK';

  bytes32[5] public ASSETS = [USD, BTC, ETH, XRP, LNK];

  address public oracle;


  /* ========== SETTERS ========== */


  /**
   * Sets the new oracle
   * The oracle is an entity authorised to set assets prices
   * @dev _oracle the address of the new oracle
  **/
  function setOracle(address _oracle) public onlyOwner {
    require(address(_oracle) != address(0), "The oracle cannot set to a null address");

    oracle = _oracle;

    emit OracleChanged(oracle);
  }


  /**
   * Sets the price for an asset
   * @dev _asset the address of the given asset
   * @dev _price updated price of the given asset
  **/
  function setPrice(bytes32 _asset, uint256 _price) public onlyOracle {
    require(_price > 0, "The price must be greater than zero");

    prices[_asset] = _price;

    emit PriceUpdated(_asset, _price);
  }



  /* ========== VIEW FUNCTIONS ========== */


  /**
   * Returns the current price of an asset
   * @dev _asset the address of the queried asset
  **/
  function getPrice(bytes32 _asset) external override view returns(uint256) {
    return prices[_asset];
  }


  /**
   * Returns all the supported assets
  **/
  function getAllAssets() external view override returns(bytes32[] memory result) {
    result = new bytes32[] (ASSETS.length);
    for(uint i = 0; i< ASSETS.length; i++) {
      result[i] = ASSETS[i];
    }
  }


  /* ========== MODIFIERS ========== */


  /**
    * @dev Throws if called by any account other than the oracle
  **/
  modifier onlyOracle() {
    require(oracle == msg.sender, "SimplePriceProvider: caller is not the oracle");
    _;
  }


  /* ========== EVENTS ========== */


  /**
    * @dev emitted after the owner changes oracle
    * @param oracle the address of new oracle which is authorised to provide prices
  **/
  event OracleChanged(address indexed oracle);

  /**
    * @dev emitted after the price of an asset gets updated
    * @param asset the asset whose price is updated
    * @param price the new price
  **/
  event PriceUpdated(bytes32 indexed asset, uint256 price);


}
