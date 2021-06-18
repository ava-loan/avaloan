// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "./SmartLoan.sol";
import "./Pool.sol";
import "./IPriceProvider.sol";
import "./IAssetsExchange.sol";

/**
 * @title SmartLoansFactory
 * It creates and fund the Smart Loan.
 * It's also responsible for keeping track of the loans and ensuring they follow the solvency protection rules
 * and could be authorised to access the lending pool.
 *
 */
contract SmartLoansFactory is IBorrowersRegistry {

  event SmartLoanCreated(address indexed accountAddress, address indexed creator);

  Pool private pool;
  IPriceProvider private priceProvider;
  IAssetsExchange assetsExchange;

  uint256 private constant MAX_VAL = 2**256-1 ether;

  mapping(address => SmartLoan) public creatorsToAccounts;
  mapping(address => address) public accountsToCreators;

  SmartLoan[] loans;

  constructor(
    Pool _pool,
    IPriceProvider _priceProvider,
    IAssetsExchange _assetsExchange
  ) {
    pool = _pool;
    priceProvider = _priceProvider;
    assetsExchange = _assetsExchange;
  }

  function createLoan() public returns(SmartLoan) {
    SmartLoan newAccount = new SmartLoan(priceProvider, assetsExchange, pool);

    //Update registry and emit event
    updateRegistry(newAccount);
    newAccount.transferOwnership(msg.sender);

    return newAccount;
  }

  function createAndFundLoan(uint256 _initialDebt) external payable returns(SmartLoan) {
    SmartLoan newAccount = new SmartLoan(priceProvider, assetsExchange, pool);

    //Update registry and emit event
    updateRegistry(newAccount);

    //Fund account with own funds and credit
    newAccount.fund{value:msg.value}();
    newAccount.borrow(_initialDebt);
    require(newAccount.isSolvent());

    newAccount.transferOwnership(msg.sender);

    return newAccount;
  }

  function updateRegistry(SmartLoan _newAccount) internal {
    creatorsToAccounts[msg.sender] = _newAccount;
    accountsToCreators[address(_newAccount)] = msg.sender;
    loans.push(_newAccount);

    emit SmartLoanCreated(address(_newAccount), msg.sender);
  }

  function canBorrow(address _account) external view override returns(bool) {
    return accountsToCreators[_account] != address(0);
  }

  function getAccountForUser(address _user) external view override returns(address) {
    return address(creatorsToAccounts[_user]);
  }

  function getOwnerOfLoan(address _loan) external view override returns(address) {
    return accountsToCreators[_loan];
  }

  function getAllLoans() public view returns(SmartLoan[] memory) {
    return loans;
  }

}
