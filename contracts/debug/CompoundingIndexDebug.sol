pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../WadRayMath.sol";

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CompoundingIndex is Ownable {
  using SafeMath for uint256;
  using WadRayMath for uint256;

  uint256 private constant SECONDS_IN_YEAR = 31536000;
  uint256 private constant BASE_RATE = 1 ether;

  uint256 public start = now;

  uint256 public index = BASE_RATE;
  uint256 public indexUpdateTime = start;

  mapping(uint256 => uint256) prevIndex;
  mapping(address => uint256) userUpdateTime;

  uint256 public rate;


  function setRate(uint256 _rate) public onlyOwner {
    updateIndex();
    rate = _rate;
  }


  function updateUser(address user) public onlyOwner {
    userUpdateTime[user] = now;
    prevIndex[now] = getIndex();

    //console.log("Updated at: ", now);
    //console.log("Updated index to: ", prevIndex[now]);
  }


  function getIndexedValue(uint256 value, address user) public view returns(uint256) {
    //uint256 lastIndex = prevIndex[getLastUserUpdateTime(user)];
    //console.log("Last time: ", getLastUserUpdateTime(user));
    //console.log("Last index: ", lastIndex);
    //console.log("Start time: ", start);

    return value.wadToRay()
    .rayMul(getIndex().wadToRay())
    .rayDiv(prevIndex[getLastUserUpdateTime(user)].wadToRay())
    .rayToWad();
  }


  function updateIndex() internal {
    prevIndex[indexUpdateTime] = index;

    //console.log("Updated at: ", indexUpdateTime);
    //console.log("Updated index to: ", index);


    index = getIndex();
    indexUpdateTime = now;
  }


  function getLastUserUpdateTime(address user) internal view returns(uint256) {
    return userUpdateTime[user] == 0 ? start : userUpdateTime[user];
  }


  function getCompoundedFactor(uint256 period) internal view returns(uint256) {
    return rate.wadToRay().div(SECONDS_IN_YEAR)
    .add(WadRayMath.ray()).rayPow(period);
  }


  function getIndex() public view returns(uint256) {
    uint256 period = now.sub(indexUpdateTime);
    if (period > 0) {
      return index.wadToRay().rayMul(getCompoundedFactor(period)).rayToWad();
    } else {
      return index;
    }
  }

}
