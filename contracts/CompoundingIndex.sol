// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "./WadRayMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

/**
  * CompoundingIndex
  * The contract contains logic for time-based index recalculation with minimal memory footprint.
  * It could be used as a base building block for any index-based entities like deposits and loans.
  * @dev updatedRate the value of updated rate
**/
contract CompoundingIndex is Ownable {
    using WadRayMath for uint256;

    uint256 private constant SECONDS_IN_YEAR = 31536000;
    uint256 private constant BASE_RATE = 1 ether;

    uint256 public start = block.timestamp;

    uint256 public index = BASE_RATE;
    uint256 public indexUpdateTime = start;

    mapping(uint256 => uint256) prevIndex;
    mapping(address => uint256) userUpdateTime;

    uint256 public rate;


    /* ========== SETTERS ========== */


    /**
     * Sets the new rate
     * Before the new rate is set, the index is updated accumulating interests
     * @dev updatedRate the value of updated rate
    **/
    function setRate(uint256 _rate) public onlyOwner {
        updateIndex();
        rate = _rate;
        emit RateUpdated(rate);
    }


    /* ========== MUTATIVE FUNCTIONS ========== */


    /**
     * Updates user index
     * It persists the update time and the update index time->index mapping
     * @dev user address of the index owner
    **/
    function updateUser(address user) public onlyOwner {
        userUpdateTime[user] = block.timestamp;
        prevIndex[block.timestamp] = getIndex();
    }


    /* ========== VIEW FUNCTIONS ========== */


    /**
     * Gets current value of the compounding index
     * It recalculates the value on-demand without updating the storage
    **/
    function getIndex() public view returns(uint256) {
      uint256 period = block.timestamp - indexUpdateTime;
      if (period > 0) {
        return index.wadToRay().rayMul(getCompoundedFactor(period)).rayToWad();
      } else {
        return index;
      }
    }


   /**
     * Gets the user value recalculated to the current index
     * It recalculates the value on-demand without updating the storage
    **/
    function getIndexedValue(uint256 value, address user) public view returns(uint256) {
        uint256 prevUserIndex = userUpdateTime[user] == 0 ? BASE_RATE : prevIndex[getLastUserUpdateTime(user)];

        return value.wadToRay()
        .rayMul(getIndex().wadToRay())
        .rayDiv(prevUserIndex.wadToRay())
        .rayToWad();
    }


    /* ========== INTERNAL FUNCTIONS ========== */


    function updateIndex() internal {
      prevIndex[indexUpdateTime] = index;

      index = getIndex();
      indexUpdateTime = block.timestamp;
    }

    function getLastUserUpdateTime(address user) internal view returns(uint256) {
      return userUpdateTime[user] == 0 ? start : userUpdateTime[user];
    }


    function getCompoundedFactor(uint256 period) internal view returns(uint256) {
      return ((rate.wadToRay() / SECONDS_IN_YEAR) + WadRayMath.ray()).rayPow(period);
    }


    /* ========== EVENTS ========== */


    /**
     * @dev updatedRate the value of updated rate
    **/
    event RateUpdated(uint256 updatedRate);

}
