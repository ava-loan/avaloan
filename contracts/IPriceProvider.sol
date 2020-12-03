pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CompoundingIndex.sol";
import "./IRatesCalculator.sol";

/**
 * @title IPriceProvider
 * @dev Interface that provides current price in AVAX for given asset
 */
interface IPriceProvider {

  /**
   * Returns the current price of an asset
   * @dev _asset the address of the queried asset
  **/
  function getPrice(bytes32 _asset) external view returns(uint256);

}
