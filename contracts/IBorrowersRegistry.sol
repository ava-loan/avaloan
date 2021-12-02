// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;


/**
 * @title IBorrowersRegistry
 * Keeps a registry of created trading accounts to verify their borrowing rights
 */
interface IBorrowersRegistry {

  function canBorrow(address _account) external view returns(bool);

  function getLoanForOwner(address _owner) external view returns(address);

  function getOwnerOfLoan(address _loan) external view returns(address);

}
