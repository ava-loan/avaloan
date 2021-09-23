// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "./SmartLoan.sol";
import "./Pool.sol";
import "./IPriceProvider.sol";
import "./IAssetsExchange.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

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
  UpgradeableBeacon public upgradeableBeacon;

  uint256 private constant MAX_VAL = 2**256-1 ether;

  mapping(address => SmartLoan) public ownersToLoans;
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
    SmartLoan smartLoanImplementation = new SmartLoan();
    upgradeableBeacon = new UpgradeableBeacon(address(smartLoanImplementation));
    upgradeableBeacon.transferOwnership(msg.sender);
  }

  function createLoan() public returns(SmartLoan) {
    BeaconProxy beaconProxy = new BeaconProxy(payable(address(upgradeableBeacon)), abi.encodeWithSelector(SmartLoan.initialize.selector, address(priceProvider), address(assetsExchange), address(pool)));
    SmartLoan smartLoan = SmartLoan(payable(address(beaconProxy)));

    //Update registry and emit event
    updateRegistry(smartLoan);
    smartLoan.transferOwnership(msg.sender);

    return smartLoan;
  }

  function createAndFundLoan(uint256 _initialDebt) external payable returns(SmartLoan) {
    BeaconProxy beaconProxy = new BeaconProxy(payable(address(upgradeableBeacon)), abi.encodeWithSelector(SmartLoan.initialize.selector, address(priceProvider), address(assetsExchange), address(pool)));
    SmartLoan smartLoan = SmartLoan(payable(address(beaconProxy)));
    smartLoan.initialize(priceProvider, assetsExchange, pool);

    //Update registry and emit event
    updateRegistry(smartLoan);

    //Fund account with own funds and credit
    smartLoan.fund{value:msg.value}();
    smartLoan.borrow(_initialDebt);
    require(smartLoan.isSolvent());

    smartLoan.transferOwnership(msg.sender);

    return smartLoan;
  }

  function updateRegistry(SmartLoan _newAccount) internal {
    ownersToLoans[msg.sender] = _newAccount;
    accountsToCreators[address(_newAccount)] = msg.sender;
    loans.push(_newAccount);

    emit SmartLoanCreated(address(_newAccount), msg.sender);
  }

  function canBorrow(address _account) external view override returns(bool) {
    return accountsToCreators[_account] != address(0);
  }

  function getAccountForUser(address _user) external view override returns(address) {
    return address(ownersToLoans[_user]);
  }

  function getOwnerOfLoan(address _loan) external view override returns(address) {
    return accountsToCreators[_loan];
  }

  function getAllLoans() public view returns(SmartLoan[] memory) {
    return loans;
  }

}
