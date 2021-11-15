// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IRatesCalculator.sol";
import "./WadRayMath.sol";
import "hardhat/console.sol";

/**
 * @title VariableUtilisationRatesCalculator
 * @dev Contract which calculates the interest rates based on pool utilisation.
 * Utilisation is computed as the ratio between funds borrowed and funds deposited to the pool.
 * Borrowing rates are calculated using a piecewise linear function. The first piece defined by UTILISATION_FACTOR (slope)
 * and OFFSET (shift). Second piece is defined by previous function, BREAKPOINT (threshold value) and MAX_RATE
 * (value at pool utilisation of 1).
 */
contract VariableUtilisationRatesCalculator is IRatesCalculator, Ownable {
  using WadRayMath for uint256;

  uint256 public constant UTILISATION_FACTOR = 5 * 10 ** 17;
  uint256 public constant OFFSET = 5 * 10 ** 16;
  // BREAKPOINT must be lower than 1 ether
  uint256 public constant BREAKPOINT = 8 * 10 ** 17;
  uint256 public constant MAX_RATE = 75 * 10 ** 16;


  /* ========== VIEW FUNCTIONS ========== */


  /**
    * Returns the pool utilisation, which is a ratio between loans and deposits
    * utilisation = value_of_loans / value_of_deposits
    * @dev _totalLoans total value of loans
    * @dev _totalDeposits total value of deposits
  **/
  function getPoolUtilisation(uint256 _totalLoans, uint256 _totalDeposits) public pure returns (uint256) {
    if (_totalDeposits == 0) return 0;

    return _totalLoans.wadToRay()
    .rayDiv(_totalDeposits.wadToRay())
    .rayToWad();
  }


  /**
    * Returns the current deposit rate
    * The value is based on the current borrowing rate and satisfies the invariant:
    * value_of_loans * borrowing_rate = value_of_deposits * deposit_rate
    * @dev _totalLoans total value of loans
    * @dev _totalDeposits total value of deposits
  **/
  function calculateDepositRate(uint256 _totalLoans, uint256 _totalDeposits) external view override returns (uint256) {
    if (_totalDeposits == 0) return 0;

    return this.calculateBorrowingRate(_totalLoans, _totalDeposits).wadToRay()
    .rayMul(_totalLoans.wadToRay())
    .rayDiv(_totalDeposits.wadToRay())
    .rayToWad();
  }


  /**
  * Returns the current borrowing rate
  * The value is based on the pool utilisation according to the piecewise linear formula:
  * 1) for pool utilisation lower than or equal to breakpoint
  * borrowing_rate = UTILISATION_FACTOR * utilisation + OFFSET
  * 2) for pool utilisation greater than breakpoint
  * slope_factor = (MAX_RATE - OFFSET - UTILISATION_FACTOR * BREAKPOINT) / (1 - BREAKPOINT)
  * borrowing_rate = slope_factor * utilisation + MAX_RATE - slope_factor
  * @dev _totalLoans total value of loans
  * @dev _totalDeposits total value of deposits
**/
  function calculateBorrowingRate(uint256 totalLoans, uint256 totalDeposits) external view override returns (uint256) {
    uint256 poolUtilisation = getPoolUtilisation(totalLoans, totalDeposits);

//    require(poolUtilisation <= 1 ether, "Pool utilisation cannot be greater than 1.");


    if (poolUtilisation <= BREAKPOINT) {
      return poolUtilisation.wadToRay()
      .rayMul(UTILISATION_FACTOR.wadToRay()).rayToWad()
      + OFFSET;
    } else {
      uint256 slopeFactor = (
      MAX_RATE
      - OFFSET
      - UTILISATION_FACTOR.wadToRay()
      .rayMul(BREAKPOINT.wadToRay()).rayToWad()).wadToRay()
      .rayDiv(
        (1 ether - BREAKPOINT).wadToRay()
      )
      .rayToWad();

      return slopeFactor.wadToRay()
      .rayMul(poolUtilisation.wadToRay()).rayToWad()
      + MAX_RATE
      - slopeFactor;
    }
  }
}
