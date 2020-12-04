pragma solidity 0.6.0;

import "./SmartLoan.sol";

/**
 * @title IBorrowersRegistry
 * Keeps a registry of created trading accounts to verify their borrowing rights
 */
interface IBorrowersRegistry {

  function canBorrow(address _account) external view returns(bool);

  function getAccountForUser(address _user) external view returns(SmartLoan);

  function getOwnerOfLoan(address _loan) external view returns(address);

}
