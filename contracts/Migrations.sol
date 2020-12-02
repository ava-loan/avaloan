pragma solidity >=0.4.21 <0.7.0;

/**
  * Migrations
  * A helper contract to manage truffle migrations
**/
contract Migrations {
  address public owner;
  uint public last_completed_migration;

  constructor() public {
    owner = msg.sender;
  }

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }
}
